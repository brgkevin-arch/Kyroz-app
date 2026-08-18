# AGENTS.md — Kyroz · État du build (handoff inter-sessions)

> Spec stable → `CLAUDE.md`. Ici = état d'avancement + pièges. Tenir à jour en fin de session.

## 🧭 Comment lire ce fichier

Rangé le **2026-07-30**. Trois niveaux, dans cet ordre :

1. **La carte des docs** ci-dessous — quel fichier sert à quoi.
2. **⏳ Ce qui reste à faire** — *la* liste de tâches, il n'y en a plus qu'une.
3. **📖 Référence** (comment ça marche) puis **📚 Journal** (ce qui a été livré).

**Règle** : une tâche vit dans la liste unique. Quand elle est faite, elle descend dans le
Journal avec sa date. On ne crée pas une deuxième liste — c'est ce qui avait produit trois
listes contradictoires.

## Carte des docs — lire ceci d'abord (rangé le 2026-07-30)

**Les 12 docs VIVANTS, et rien d'autre** (recomptés le 2026-07-30 : la carte en annonçait
6, en listait 8 et en oubliait 4 — `TESTFLIGHT.md` ajouté le 2026-08-03) :

*Ce qui pilote le travail — à lire d'abord*

| Doc | À quoi il sert |
|---|---|
| `CLAUDE.md` | **Spec stable** — décisions de fond, garde-fous §6 non négociables. Le *pourquoi*. |
| `AGENTS.md` | **Ce fichier** — état d'avancement, chantiers ouverts, pièges. Le *où on en est*. |
| `docs/INVENTAIRE-CODE-2026-07-30.md` | **Photo factuelle du code** — duplications, points d'écriture, zones risquées. Mesurée. |

*Chantiers spécialisés — à ouvrir quand on touche au domaine*

| Doc | À quoi il sert |
|---|---|
| `Recette/README.md` | Chaîne d'ajout de recettes (drops, merge, vérifications) + la convention « une vague peut RÉÉCRIRE ». |
| `Recette/BRIEF-GENERATION-RECETTES.md` | Spec de génération, auto-portante. **§4.12 = les 5 règles de la collation**, §4.2 les ancres, §6 l'anti-doublons. Certains blocs du §5 sont des commandes LIVRÉES, marquées comme telles. |
| `MONETISATION.md` | Kyroz+ : tranché, et **le code est livré en entier** (écran, verrou, SDK). ⚠️ **DEUX piliers depuis le 2026-08-18, plus trois** : la banque de calories est sortie de Kyroz+ (décision fondateur) — moteur intact, dégaté, renommé « Jours plus copieux », **puis ÉTEINT le même jour** (`lib/featureFlags.ts`). Ne restent que des étapes de COMPTES et de revue — cf. AGENTS.md B2. |
| `test/README.md` | Parcours Playwright — **ne tournent pas dans `npm test`**, pièges du socle. |

*Sortie, conformité, exploitation*

| Doc | À quoi il sert |
|---|---|
| `STORE-RELEASE.md` | Playbook de sortie stores — **en cours** ; reste ce qui demande identité / argent / device. |
| `TESTFLIGHT.md` | **Distribution iOS aux testeurs** (2026-08-03) — repères fixes (app id, team id, **quel Apple ID est l'identifiant de connexion**), état, commandes que je peux lancer seul depuis la clé API. Les deux pièges qui ont coûté du temps y sont : l'ad hoc échoue **en silence** depuis un navigateur intégré, et l'accès relecteur dépend de l'auth anonyme Supabase. |
| `RGPD-REGISTRE.md` | Registre de traitement. |
| `supabase/RUNBOOK-PROD.md` | Étapes Supabase **non faisables depuis le dépôt** (accès projet requis). |
| `../docs/politique-confidentialite-kyroz.md` | Politique de confidentialité **publique**. ⚠️ Datée le 2026-08-05 (elle portait le gabarit `[JJ/MM/AAAA]`), et **elle a DIVERGÉ du texte que l'app affiche** : 10 sections contre 11, et surtout **pas de § Mineurs** alors que le blocage des moins de 18 ans est un garde-fou dur (§6). Écart mesuré en tête du fichier ; décision fondateur attendue (copie générée depuis `constants/legal.ts`, ou alignement manuel). |
| `../README.md` (racine) | Présentation du dépôt + mode d'emploi testeur. |

**`docs/archive/` = MORT. Ne pas exécuter, ne pas citer comme référence courante.**
Quatre docs y décrivent un travail déjà livré, un cinquième une décision annulée. Chacun
porte un en-tête `ARCHIVÉ` qui dit pourquoi. Le piège principal (un plan affichant 79
tâches non cochées alors qu'il est intégralement livré) y est neutralisé.

**Règle** : un document qui devient une trace part dans `docs/archive/` avec un préfixe
de date et un en-tête `ARCHIVÉ` — pas à la racine sans date. C'est ce qui avait produit
le désordre : dix fichiers au même niveau dont seul le contenu, en ligne 10, révélait
qu'ils étaient périmés.

## 📍 OÙ ON EN EST — photo du 2026-08-10

> 🔴 **CE QUI A CHANGÉ DANS LA NUIT DU 9 AU 10 AOÛT — sept PR, toutes mergées et
> déployées.** À lire avant de se fier à une ligne ancienne de cette table :
> **E22** (les 9 derniers émojis + le compteur qui manquait) · **les deux pièges de
> la refonte du Profil**, fermés AVANT elle · **E25, la refonte du Profil** (roue
> dentée, feuille Réglages, écran « Donner mon avis ») **puis E26, ce qu'elle avait
> laissé derrière elle** (le mot « Réglages » désignait deux endroits, deux lignes
> menaient à la même route, le TDEE était à 900 px de sa cible) · **D23** (la vague catalogue
> part en OTA, pas dans le binaire) · la **séquence de soumission** écrite dans
> `STORE-RELEASE.md` §0-bis, et deux affirmations de ce playbook démenties par le
> disque. **E26** (le consentement analytics quitte l'écran Plan et passe AVANT
> l'assistant ; 7 → 13 events ; `goal`/`restrictions` retirés d'`onboarding_completed`,
> où ils partaient depuis le premier commit). `main` porte tout ça ; **le dépôt
> principal, lui, peut être en retard** — le vérifier avant toute capture ou tout build.

> Bloc à relire en premier dans une nouvelle session, et à **re-mesurer** avant de s'en
> servir (les commandes sont données). Il ne remplace pas la liste unique ci-dessous.

| | valeur | comment la revérifier |
|---|---|---|
| Catalogue | **512 recettes** — 122 petits-déj · 280 repas complets · 110 collations | `npm run mesure:couverture` |
| `ENGINE_VERSION` | **47** (invalide les plans en cache) — créneaux de repas LIBRES : l'ordre canonique de la journée devient CHRONOLOGIQUE (la collation de 16 h passe avant le dîner, elle était servie en dernier), donc le report de budget de repas en repas change d'ordre *(46 = le budget du jour suit la dépense RÉELLE du jour, `lib/dailyBudget.ts`)*. ⚠️ Cette ligne est restée à **45** pendant une journée entière après le bump : celui qui incrémente la constante est celui qui doit toucher cette case | `lib/planEngine.ts` |
| `ENGINE_REV` | **7** (avertissement one-shot à l'utilisateur) — E30, **DEUX causes** : (a) les planchers dérivés de la masse maigre (BMR + énergie disponible) se retirent au-delà de 30 %/40 % de MG, le cap 25 % du TDEE prend le relais ; (b) `bulk` refermé sur `lean_bulk`. ⚠️ **Première révision à porter deux causes** → `EngineNotice.cause` existe pour que l'écran ne serve pas à l'une l'explication de l'autre *(6 = E23, la provenance du %MG décide de Katch ; 5 = A15, l'objectif daté hors de portée sert le rythme sûr MAXIMAL)* | `lib/tdee.ts` |
| Objectif daté | la date affichée est un **POINT FIXE** : l'adopter ne la déplace plus (3 corps sur 8 glissaient de +96 j avant A15) | `npm run mesure:objectif` |
| Échéance de l'objectif daté | 🔴 **C'est une DATE, plus une durée** (A28, 2026-08-07, décision fondateur) : la rangée de 5 puces est **RETIRÉE**, on saisit jour/mois/année, et l'écran donne une **ESTIMATION** — « la première date que Kyroz peut tenir », + « Viser cette date » en un tap. Refus de la date passée et de l'au-delà de 5 ans (au-delà, le moteur creuse au MAXIMUM : −55 → −418 kcal/j sur `F 78 → 65`). ⚠️ L'estimation vient de la **marche 1 de `deadlineLadder`**, PAS de `status.projectedDate` — les deux diffèrent de **12 à 100 jours** et la seconde suppose une échéance qui expire. ⚠️ **`deadlineLadder` (A27) tourne donc toujours** : estimation + date pré-remplie (2ᵉ marche) — **ne pas le supprimer comme du code mort**. Ses invariants restent mesurés : **40/40 tenables**, **40/40 servant un plan distinct**, contre 10/40 et 14/40 avec les 5 durées figées d'avant A27 | `npm run mesure:objectif` |
| Tests | **1 557 verts, 96 fichiers** — mesuré le 2026-08-15 sur `main` (`7c554d1`), `tsc` propre. Un seul fichier nouveau depuis, et il porte les deux décisions de VISÉE de la visite guidée : `visee.test.ts` (`dejaVisible`, `memeCadre`, budget de recherche), **vérifié par mutation**. `visiteGuidee.test.ts` a été ÉTENDU de six cas — dont celui qui exige qu'un tuto se quitte toujours — et son contrôle de rayon **rebasé sur l'invariant** après avoir rougi sur un correctif conforme (4ᵉ fois de cette famille, cf. E51). *(Historique : 1 539 verts, 95 fichiers — mesuré le 2026-08-14 sur `main` (`89b53aa`). Les six nouveaux fichiers de cette session-là, tous **vérifiés par mutation** : `margeFeuilles` (la marge d'un contenu de feuille), `revelation` (la séquence de paliers dictée), `cuisinerDepuisLeFrigo` (l'ordre gelé + aucun bandeau sous la barre d'onglets), `diffusion` (un état partagé passe par un store, pas par `useState`), plus `feuillesEmpilees` et `feuilles` étendus (le chantier des dialogues en feuille est CLOS, et le filet de démontage est compté). ⚠️ **Ce chiffre se RE-MESURE avant d'être cité** — il a valu 1 402, 1 445, 1 463, 1 499 puis 1 539 en quatre jours, et l'ancienne ligne était périmée de 95 tests. *(Historique : **1 444 verts**, 87 fichiers — *mesuré le 2026-08-11 sur l'arbre FUSIONNÉ `feature/methodologie-sources` + `main` (`13acf4d`, donc après E39), au dernier commit avant le merge. Nouveau fichier : `methodologie.test.ts` (13 cas, **5 mutations** — dont une VERTE à dessein : déplacer une constante du moteur ne doit PAS faire rougir la page, puisqu'elle la LIT ; c'est cette mutation-là qui a révélé qu'un chiffre retapé à l'identique passait, d'où un second test sur le NOM des constantes). ⚠️ La branche annonçait **1 445** avant de fusionner E39, qui retire 1 test net — les deux chiffres étaient justes, sur deux arbres différents.* Historique : 1 431 / 86 — *mesuré le 2026-08-11 sur l'arbre FUSIONNÉ `feature/conformite-legale` + `main` (`770187d`), au dernier commit avant le merge. ⚠️ **Ce chiffre DESCEND de 1 par rapport à `main`, et aucun test n'est perdu** : `harnaisEcrans.test.ts` génère un cas par ANCRE, et E39 en retire 3 (la question du portail, les réponses « Non », l'attestation) pour en ajouter 2. Une baisse se vérifie au lieu de s'expliquer.* Historique : 1 432 / 86 — *re-mesuré le 2026-08-11 sur `main` FUSIONNÉ (`0d91966`), après #92 (notifications) et #94 (canal de retour). ⚠️ **Septième dérive, et de mon fait** : #94 annonçait 1 414, juste sur sa branche et faux dès la fusion — elle n'avait pas touché ce compteur, ce que la règle ci-dessous exige. Et #92 avait écrit 1 429, juste avant que #94 n'ajoute ses 3 cas.* Historique : 1 429 verts, 86 fichiers — *mesuré le 2026-08-11 sur l'arbre FUSIONNÉ : notifications (E38) **plus** matériaux (E36) **plus** haptique (E37), au dernier commit avant le merge. 🔴 **HUITIÈME dérive, et la troisième du même jour** : trois branches ont annoncé 1 413 / 84, 1 403 / 85 et 1 411 / 86 — chacune juste chez son auteur, aucune vraie après fusion, et git a levé un conflit sur cette ligne même **deux fois de suite**. Nouveaux fichiers venus d'à côté : `materiauxDA.test.ts` et `haptiqueDA.test.ts` ; les +26 cas des notifications vont dans deux fichiers existants. ➡️ **Ce compteur ne se recopie jamais, il se RE-MESURE au dernier commit avant le merge** — et si `main` bouge entre-temps, on recommence.* Historique : 1 395 / 84 — re-mesuré le 2026-08-10 sur la branche du mouvement (E35) REBASÉE sur `origin/main`, au DERNIER commit avant le merge — c'est la seule fenêtre où ce chiffre est vrai, cf. #81 fermée pour l'avoir mesuré à l'ouverture. Nouveau fichier : `mouvementDA.test.ts` (14 cas, 3 mutations). SIXIÈME dérive : la PR #86 (tuto) avait déplacé le chiffre sans toucher la case.* Historique : 1 378 / 83 le 2026-08-10 après #75/#80. 🔴 **CINQUIÈME dérive le même jour, et elle apporte une nuance que les quatre précédentes n'avaient pas** : une PR ouverte pour corriger ce compteur (#81, `1 367 / 82`) a été **fermée sans merger** parce qu'elle était devenue fausse ENTRE son ouverture et son merge — deux PR avaient fusionné entre-temps. ➡️ « Mesurer sur `main` fusionné » ne suffit donc pas : il faut mesurer **AU MOMENT DU MERGE**, pas à l'ouverture de la PR. Et une PR qui ne porte QUE ce compteur est structurellement condamnée à périmer — le mettre à jour dans la PR de contenu, au dernier commit avant le merge · `tsc` propre — **mesuré le 2026-08-10 sur la branche E33/E34 REBASÉE sur `origin/main` (`bf5ecac`), donc après le merge de #74 ; sur `main` seul : 1 367 / 82.** Nouveau fichier : `profilSection.test.ts` (11 cas, 9 mutations — le rangement de l'onglet Profil). ⚠️ Re-mesuré TROIS fois dans la même session (1 340 → 1 345 → 1 378) : chaque valeur était juste sur sa base et fausse au rebase suivant.)* |
| Design | **9 passes livrées** — la 9ᵉ est celle des **TRANSITIONS** (2026-08-15, E51) : six endroits où la mise en page changeait d'un bloc sans rien entre l'avant et l'après, dont le curseur des **17 sélecteurs** de l'app. ⚠️ Elle ne renie PAS la retenue de la passe mouvement (« les 48 fichiers muets restent muets ») — elle la précise : ce qui manquait n'était pas du mouvement, c'était une classe précise, jamais balayée. Quatre candidats ont été écartés à dessein, et le pourquoi compte autant que les six retenus (CLAUDE.md §8). *(La 8ᵉ était la **revue page par page du Frigo, des Recettes, du Profil et de la feuille de pesée** (2026-08-14, E46/E48/E49) : rayons repliables, listes dévoilées par paliers, série réduite à une pastille, carte du poids devenue le sujet de l'écran, feuille de pesée qui tient sans défiler. ⚠️ Trois défauts de MISE EN PAGE trouvés en la faisant, tous invisibles à la relecture : une courbe à `width={260}` en dur, un bandeau dessiné sous la barre d'onglets, une marge de feuille absente. *(Historique : la 7ᵉ était la **refonte du Profil du 2026-08-10** (E25) : la moitié de l'écran passe derrière une roue dentée, 1 848 → 1 718 lignes, et un écran « Donner mon avis » apparaît. *(Les six précédentes :)* **6 passes** — 5 onglets refaits (2026-08-03) · rayons (2026-08-03) · repli du grand titre (2026-08-04) · échelle typo, 333 sites (2026-08-05) · espacement + cibles tactiles 44 pt, 537 sites (2026-08-06) · finitions trait/icône/retour au toucher (2026-08-06) · **écran Plan allégé + accent étendu à la barre de macros (2026-08-06)**. **Design system poussé vers Claude Design** — 6 pages GÉNÉRÉES depuis `theme.ts` (`npm run design:build`), jamais écrites à la main. Maquette de référence : `mockups/kyroz-mockup.html` — **versionnée depuis le 2026-08-06**, à la RACINE du dépôt, hors du dossier `kyroz-app/`. *(La formulation d'avant, « hors dépôt app », se lisait « hors versionnement » : le fichier est resté 3 jours sur une seule machine tout en étant cité ici comme référence.)* ⚠️ Ni le rayon, ni la taille de texte, ni l'espacement ne se relisent — ils se **mesurent** | `npm test -- rayonsDA typoDA espacementDA finitionsDA` · `getComputedStyle` dans le panneau, cf. `docs/comparer-maquette.md` |
| Plateformes | iPhone **+ iPad** (`supportsTablet: true` depuis le 2026-08-01). ⚠️ **portrait sur iPhone, MAIS les 4 orientations sur iPad** — Expo les force dès `supportsTablet`, le multitâche iPadOS l'impose, ce n'est pas refermable. Vérifié en natif (iPad Pro 13") et à 1366×1024 | `ios/Kyroz/Info.plist` généré, PAS `app.json` · `lib/layout.ts` |
| Sortie stores | iOS **1.0.0 (6)** — `ceec1b17`, commit **`1047b9f`**, `finished` le 2026-08-11 à 20 h 37, **téléversé à App Store Connect**. C'est le **seul des trois** builds du jour à porter E39 (retrait du portail) et E40 (page méthodologie), donc le seul cohérent avec les notes du relecteur. Le (5) est aussi chez Apple — **utile à TESTER, à ne PAS envoyer en revue**. 🔴 **Un (7) sera nécessaire** : le fondateur a annoncé le 11 au soir vouloir retoucher le front avant les captures ; le (6) périmera à ce moment-là. **Un seul build, après que le code est figé.** 🔴 **LEÇON DU JOUR — un binaire se périme PENDANT qu'il compile.** Le (4) a été dépassé **six minutes** après son lancement (#92), puis par #94 ; le (5) par #96 et #97. La cause n'est pas le système mais le contrôle : on vérifiait « l'arbre est propre » sans vérifier « rien n'est en vol ». ➡️ **Deux mesures avant un build** — `git status` vide **et** `HEAD == origin/main` **et** `gh pr list --state open` à **0** (+ `git worktree list`) — **et une après** : `git rev-parse origin/main` doit encore valoir le commit du build. ⚠️ **Un build n'est ni gros ni petit, c'est une PHOTO de `main`** : on n'en regroupe pas plusieurs, on en fait UN quand le code ne bouge plus. *(Historique :)* DEUX builds lancés le 2026-08-11 (13 h 18 et 13 h 41), tous deux `finished`, profil `production`. 🔴 **CETTE CASE ANNONÇAIT ENCORE « (3) », soit DEUX builds de retard — et c'est la deuxième fois qu'elle ment dans ce sens** (déjà le 2026-08-03 : « build à faire » alors qu'il était fait). ➡️ **Un build se constate en interrogeant EAS, jamais en relisant cette ligne** : `npx eas-cli build:list --platform ios` depuis `kyroz-app/` (depuis la racine du monorepo il rend « Run this command inside a project directory »). 🔴 **ET LE PLUS IMPORTANT N'EST PAS LE NUMÉRO, C'EST LE COMMIT.** Le (5) est bâti sur `770187d`, donc **AVANT** les merges de #96 (E39) et #97 (E40) : **ni le retrait du portail de dépistage, ni la page « Méthodologie & sources » ne sont dans un binaire.** Vérifié par ancêtre git, pas par la date. *(Le (4), lui, est sur `10d6096` : mouvement, verre, retour au toucher.)* ⚠️ **Conséquence sur la soumission, et elle est bloquante** : les notes du relecteur (`STORE-RELEASE.md` §11) lui indiquent où trouver la page méthodologie — or il ouvre l'app UNE fois, et une OTA ne s'applique qu'au lancement SUIVANT. Avec le (5), il suivrait les instructions et ne trouverait pas l'écran. **Un build (6) depuis `main` est requis avant de soumettre**, ou les notes doivent cesser de le promettre. ⚠️ ✅ Écart web/natif **REFERMÉ** par la 11ᵉ OTA (`c0e63d50`, 2026-08-11) — il avait duré quelques heures. *(Il était rouvert : le site servait E39 + E40, aucun binaire ne les avait.)* Écart de comportement (le portail de dépistage tourne encore chez les testeurs) et non calorique. **revue bêta APPROUVÉE le 2026-08-03** — donc acquise : **revue bêta APPROUVÉE le 2026-08-03** — donc acquise : builds et testeurs suivants passent sans repasser par Apple. 2 testeurs `INSTALLED` (1 interne, 1 externe) · Android : 2 builds, rien de soumis. ⚠️ Ce build **reçoit les OTA** (voir ligne ci-dessous) : il ne porte donc plus le JS de son commit d'origine. La déclaration `ITSAppUsesNonExemptEncryption` est enfin **committée** (elle n'a vécu que sur une machine du 2026-08-02 au 2026-08-06) | `npx eas-cli build:list` · `TESTFLIGHT.md` |
| Kyroz+ | **encaissement armé, verrou inerte.** Clé RevenueCat posée dans EAS et vérifiée dans le bundle ; `PAYWALL_LAUNCH` = `null`, donc **tout est gratuit pour tout le monde**. ⚠️ Le build TestFlight actuel est ANTÉRIEUR à la clé | `lib/premium.ts` · `npx eas-cli env:list production` |
| Clés du build/OTA | **une seule source : les variables EAS.** `eas.json` ne porte plus aucune clé, chaque profil déclare son `environment`. ⚠️ **`eas update --clear-cache`** — le cache Metro ignore un changement de valeur `EXPO_PUBLIC_*` | `npx eas-cli config --profile production --platform ios` · `lib/__tests__/easEnv.test.ts` |
| OTA publiées | **15** — la dernière est celle du **TUTO QUI VISAIT À CÔTÉ ET DES SIX TRANSITIONS**, publiée le **2026-08-15** depuis un arbre PROUVÉ identique à `main` (`9e12d47`, PR #109 et #110), groupe `482217a1`, iOS **et** Android, runtime 1.0.0, vérifiée en tête du canal (`channel:view`). Elle porte **E50** (l'anneau désignait l'objet d'une autre bulle, la mesure tombait en plein vol d'un défilement, et une cible introuvable donnait un écran assombri **sans bulle ni « Passer »** — donc sans aucune sortie) et **E51** (six endroits qui téléportaient : le curseur des 17 sélecteurs, « J'ai cuisiné », le repli des rayons, les trois listes à paliers, la jauge des Courses, l'anneau du tuto). 📋 **Relevé de la mesure préalable** (`env:exec production` + export `--clear`, `.env.local` ÉCARTÉ pendant la mesure **ET** pendant la publication) : URL Supabase **1** · `sb_publishable_` **1** · `sk-ant-` **0** · `service_role` **0** · `phc_` **0** · chemin local **0**. Sonde prouvée dans les deux sens : `Continuer` **1**, `zzz_chaine_inexistante` **0**. ✅ **ET POUR UNE FOIS LE COUPLE PRÉSENT/ABSENT A ÉTÉ FAIT PROPREMENT** — au lieu de chercher un témoin de retrait, on a gardé le bundle de la 14ᵉ et comparé les MÊMES témoins sur les deux : `dejaVisible`, `memeCadre`, `animerMiseEnPage`, `MARGE_VISIBLE`, `ESSAIS_MESURE` valent **0 avant, 1 après**, chacun. C'est la preuve la plus forte de cette série de relevés, et elle ne coûte rien : il suffit de ne pas effacer l'export précédent. Taille de table : 20 620 → **21 055** chaînes. ⚠️ **La 15ᵉ a failli être une 15ᵉ VIDE** : le 2026-08-14, le fondateur avait demandé une OTA après une PR qui ne touchait que des `.md`. Mesurée avant publication, elle rendait le **même bundle au bit près** (7 272 082 octets, 20 620 chaînes, une seule différence — le chemin du dossier temporaire du bundler). Elle n'a pas été publiée : une entrée identique à la précédente rend ce journal faux. ➡️ *Mesurer avant de publier sert aussi à ne PAS publier.* *Historique de la 14ᵉ :* celle de celle de la **REVUE PAGE PAR PAGE DU FRIGO ET DU PROFIL**, publiée le **2026-08-14** depuis un arbre PROUVÉ identique à `main` (`8db7eca`, PR #106), groupe `716af5dc`, iOS **et** Android, runtime 1.0.0, vérifiée en tête du canal (`channel:view`). Elle porte **E44 → E49** : les trois finitions d'E43, le **septième geste mort** (« Me peser », qui fermait l'éditeur sans rien ouvrir), le tour du Frigo allégé, les listes qui se dévoilent par paliers, « Cuisiné » **qui cuisinait ce qu'on n'avait pas choisi** (quatre appuis au même pixel, quatre recettes déduites), la refonte du Profil et celle de la feuille de pesée. 📋 **Relevé de la mesure préalable** (`env:exec production` + export `--clear`, `.env.local` ÉCARTÉ pendant la mesure **ET** pendant la publication) : URL Supabase **1** · `sb_publishable_` **1** · `sk-ant-` **0** · `service_role` **0** · `phc_` **0** · chemin local **0**. Sonde prouvée dans les deux sens : `Continuer` **1**, `zzz_chaine_inexistante` **0**. Témoins présents : `PALIERS_AVANT_TOUT`, `libelleRevelation`, `MessageEnLigne`, `listeStable`, `FILET_DEMONTAGE_MS` **1 chacun**. Témoin ABSENT : `frigo-vue-cuisiner` **0**. 🔴 **CE TÉMOIN DE RETRAIT-LÀ PROUVE QUELQUE CHOSE, ET C'EST LA LEÇON DE LA 13ᵉ APPLIQUÉE** : c'est une **chaîne littérale** (`useTourTarget('frigo-vue-cuisiner')`), donc ni accentuée ni minifiable — si la cible était encore là, `strings` la verrait. Contre-épreuve faite sur le source d'hier : elle y était **deux fois**. ⚠️ **DEUX TÉMOINS ONT SORTI 0 SANS QUE LE BUNDLE SOIT EN CAUSE**, et les deux erreurs sont de MA sonde : `ordreFige` et `apresEditeur` sont des variables **locales**, donc renommées par le minificateur — un témoin doit être un symbole EXPORTÉ ou une chaîne littérale ; et « Voir + de recettes » n'existe pas telle quelle, le libellé est un gabarit (`Voir + de ${nom}`), donc la chaîne stockée est le FRAGMENT `Voir + de ` (**1**). ➡️ *Un témoin mal choisi accuse le bundle* — déjà consigné pour `attendreEtape1`, rejoué deux fois ici. *Historique de la 13ᵉ :* celle des **CINQ GESTES MORTS SUR IPHONE**, publiée le **2026-08-14** depuis un arbre PROUVÉ identique à `main` (`e907773`, PR #104), groupe `078972f3`, iOS **et** Android, runtime 1.0.0, vérifiée en tête du canal (`channel:view`). Elle porte E42 : la revue page par page du Plan et des Courses, la collision d'ingrédients (le mélange wok mangeait les carottes du frigo), l'anneau du tuto dont le trou était carré, et surtout **les cinq gestes que iOS refusait d'ouvrir — dont « Supprimer mon compte »**, qui est une obligation RGPD et un point de revue App Store. ⚠️ **Cet écart-là n'était PAS cosmétique et il n'était pas visible en web** : la revue Apple aurait pu tomber dessus. 📋 **Relevé de la mesure préalable** (`env:exec production` + export `--clear`) : URL Supabase **1** · `sb_publishable_` **1** · `sk-ant-` **0** · `phc_` **0** · témoins du chantier `Bonsoir` et `Coucou` (salutation, nouvelles ce jour) **1 chacun** · `pastille` (les formes d'anneau) **2**. 🔴 **DEUX TÉMOINS ONT RENDU 0 SANS RIEN PROUVER, ET C'EST LE PIÈGE DÉJÀ CONSIGNÉ QUI S'EST REJOUÉ** : « Retirer ces courses de l… » (chaîne AJOUTÉE ce jour) et « Pratique pour retrouver… » (chaîne RETIRÉE) rendent toutes deux **0**, parce qu'elles contiennent un `—` ou un accent — Hermes range en UTF-16 toute chaîne non-ASCII, et `strings` ne la voit pas. ➡️ **Un témoin de retrait doit être ASCII PUR d'un bout à l'autre**, sinon son zéro est muet dans les deux sens. Faute d'en trouver un ce jour-là (`sectionCount` et `rayon` vivent encore ailleurs), la preuve retenue est celle que CLAUDE.md §2 désigne comme suffisante : **l'arbre exporté EST `origin/main`** (`git diff` vide, arbre propre) **et la suite est verte** (1 499 tests, `tsc`). ⚠️ Publiée depuis un WORKTREE, défendable pour la même raison : l'égalité a été MESURÉE, pas supposée. *Historique de la 12ᵉ :* celle de la **REVUE PAGE PAR PAGE**, publiée le **2026-08-14** depuis un arbre PROUVÉ identique à `main` (`1c422af`, PR #102), groupe `00ad710d`, iOS **et** Android, runtime 1.0.0, vérifiée en tête du canal (`channel:view`). Elle porte E41 (onboarding, reveal, tuto) et surtout **A34** — le rappel quotidien passe d'un déclencheur `DAILY` à une **série datée de 30 notifications**, donc le texte tourne enfin sans ouvrir l'app. 📋 **Relevé de la mesure préalable** (`env:exec production` + export `--clear`, `.env.local` ÉCARTÉ, `strings -a` dans un FICHIER puis `grep -c`) : URL Supabase **1** · `sb_publishable_` **1** · `sk-ant-` **0** · `service_role` **0** · témoins du chantier `serieQuotidienne`, `RAPPELS_A_L_AVANCE`, `AVERTISSEMENT_MEDICAL`, `wheel-annee` **1 chacun** · `HealthScreening` (l'écran supprimé) **0** · aucun chemin local (`kevinberger` **0**). ➡️ Sonde prouvée dans les deux sens : `Continuer` **1**, `zzz_chaine_inexistante` **0**. 🔴 **UN TÉMOIN PRÉSENT *ET* UN TÉMOIN ABSENT** — c'est le couple qui prouve la version ; un seul des deux ne prouve rien. ⚠️ **Publiée depuis un WORKTREE, et ce n'est défendable que parce que l'égalité a été MESURÉE** (`git diff origin/main HEAD` vide, arbre propre) : la règle « publier depuis `main` » veut dire « ne pas publier un arbre qui diffère de `main` », et une différence nulle se prouve, elle ne se suppose pas. ⚠️ **`attendreEtape1` est sorti à 0 au relevé, et c'était l'ATTENTE qui était fausse** — il vit dans le harnais Playwright, pas dans l'app. Un témoin mal choisi accuse le bundle. *Historique de la 11ᵉ :* la dernière est celle des **QUATRE CHANTIERS DU 11**, publiée le **2026-08-11** depuis `main` (`b3edfa0`), groupe `c0e63d50`, iOS **et** Android, runtime 1.0.0, vérifiée en tête du canal. Elle porte **E37** (retour au toucher), **E38** (notifications), **E39** (retrait du portail de dépistage) et **E40** (page méthodologie), plus le canal de retour (#94). ✅ **ELLE REFERME L'ÉCART WEB/NATIF ROUVERT LE MÊME JOUR** — le site servait E39 et E40 depuis leur merge, et **aucun binaire installé ne les avait** : l'app des testeurs posait encore les deux questions de dépistage santé que la décision du fondateur avait retirées. Écart de **conformité**, pas cosmétique. 🔴 **PREMIÈRE MESURE PAR TÉMOIN NÉGATIF, et c'était la seule façon de prouver E39.** Un chantier qui RETIRE du code ne se prouve pas par une présence : on a donc vérifié que `PREGNANCY_OR_NURSING` rend **0** dans le bundle — il ne subsiste que dans des commentaires et des tests, qui ne partent pas. ➡️ **Devant un chantier de retrait, le relevé doit contenir un zéro ATTENDU**, et il faut avoir vérifié à part que la sonde sait dire OUI. 📋 **Relevé complet** (`env:exec production` + export `--clear`, `strings -a` dans un FICHIER puis `grep -c`) : URL Supabase **1** · `sb_publishable_` **1** · `sk-ant-` **0** · `service_role` **0** · chemin local **0** · témoins positifs `impactLeger` (E37), `ReminderOffer` (E38), `CIQUAL_ATTRIBUTION` (E40) et `bundle d` (#94) **1 chacun** · témoin négatif `PREGNANCY_OR_NURSING` **0** · sonde `Continuer` **1** / `zzz_chaine_inexistante` **0**. ⚠️ **`.env.local` avait DISPARU du dépôt** au moment de cette publication (absent, seul `.env.example` subsiste) — donc rien à écarter, et la mesure a porté d'office sur les variables EAS. Ce n'est pas le fait de cette session ; **à re-créer par le fondateur pour le développement local**, jamais à reconstituer de mémoire. *Historique de la 10ᵉ :* celle du **VERRE**, publiée le **2026-08-11** depuis `main` (`117f13c`), groupe `7ac2496a`, iOS **et** Android, runtime 1.0.0, vérifiée en tête du canal. Elle porte la passe matériaux (#90, E36) : la barre d'onglets en Liquid Glass sur iOS 26+, et **strictement l'app d'avant partout ailleurs** — iOS 18, Android, web, et quiconque a activé « Réduire la transparence ». ⚠️ Écart **cosmétique**, aucun `ENGINE_REV`, aucune cible ne bouge. 📋 **Relevé de la mesure préalable** (`env:exec production` + export `--clear`, `.env.local` ÉCARTÉ, `strings -a` écrit dans un FICHIER puis `grep -c`) : URL Supabase **1** · `sb_publishable_` **1** · `sk-ant-` **0** · `service_role` **0** · témoins du chantier `reduceTransparencyChanged`, `ExpoGlassEffect` et `glassEffectStyle` **1 chacun** · aucun chemin local (`kevinberger` **0**). ➡️ Sonde prouvée dans les deux sens avant d'être crue : `Continuer` **1**, `zzz_chaine_inexistante` **0**. 🔴 **NOUVEAU PIÈGE, ET IL N'ÉTAIT PAS ÉCRIT : `.env.local` doit être écarté pendant la PUBLICATION, pas seulement pendant la MESURE.** La procédure ne l'exigeait que pour la mesure — mais `expo export` recharge `.env.local` au moment de l'`update`, donc le bundle réellement envoyé n'est PAS celui qu'on vient de valider. L'écart ne se voit nulle part : la commande est verte, le relevé est vert, et ce sont deux bundles différents. ➡️ Écarter le fichier avant `eas update` et le restaurer après, comme pour l'export. ⚠️ Piège mineur du même jour : `eas update` lancé depuis la RACINE du monorepo rend « Run this command inside a project directory » — il se lance depuis `kyroz-app/`. 🔴 **Et le verre doit être dans le BINAIRE 1.0.0 (4), pas seulement en OTA** — même raison que le mouvement : le relecteur Apple ouvre l'app une fois, or une mise à jour ne s'applique qu'au lancement SUIVANT. Comme c'est sur `main`, le prochain build l'embarque de lui-même. *Historique de la 9ᵉ :* celle du **TUTO + MOUVEMENT**, publiée le **2026-08-10** depuis `main` (`04ebeae`), groupe `60a87a97`, iOS **et** Android, runtime 1.0.0. ✅ **L'ÉCART EST REFERMÉ** — il a duré ~1 h. Elle porte le correctif du tuto (#86, un tour affiché compte enfin comme vu — il revenait à chaque lancement) et toute la passe mouvement (#87, E35). ⚠️ Écart **cosmétique et correctif**, pas calorique : aucun `ENGINE_REV`, aucune cible ne bouge — contrairement à la 8ᵉ. 📋 **Relevé de la mesure préalable** (`env:exec production` + export, `.env.local` ÉCARTÉ, `strings -a` écrit dans un FICHIER puis `grep -c`) : URL Supabase **1** · `sb_publishable_` **1** · `sk-ant-` **0** · témoins du chantier `reduceMotionChanged` **1** et `@kyroz:tour:` **1** · aucun chemin de worktree **0**. ➡️ **Et la sonde a prouvé qu'elle savait dire OUI avant qu'on la croie** : `Continuer` **1**, `zzz_inexistant` **0**. ⚠️ **`--environment production` a été REFUSÉ par l'outil lui-même** en mode non-interactif (« The `--environment` flag must be set ») — le piège consigné ici s'est donc défendu tout seul cette fois, mais il reste vrai en mode interactif, où rien ne le rappelle. 🔴 **Et le mouvement doit être dans le BINAIRE 1.0.0 (4), pas seulement en OTA** — le relecteur Apple ouvre l'app une fois, or une mise à jour ne s'applique qu'au lancement suivant : il verrait l'ancien comportement. Comme c'est sur `main`, le prochain build l'embarque de lui-même. *Historique de la 8ᵉ :* la dernière publiée est celle d'**`ENGINE_REV` 7**, publiée le **2026-08-10 vers 20 h** depuis `main` (`c898544`), groupe `0098fc9a`, iOS **et** Android. ✅ **ELLE REFERME L'ÉCART CALORIQUE web/natif**, qui a duré ~6 h : `main` portait `ENGINE_REV` 7 (#74 — planchers retirés à forte adiposité, pause à la maintenance, `bulk` refermé sur `lean_bulk`) plus les paliers d'objectif, la refonte du Profil et le consentement analytics, quand les testeurs tournaient encore sur la 7ᵉ OTA (E24, 2026-08-09). ⚠️ **C'est la première fois que cet écart était CALORIQUE et non cosmétique** — le web servait des cibles que le natif ne servait pas, et l'avertissement one-shot qui les explique n'était parti que sur le web : deux plans différents pour le même profil, sans qu'aucun écran ne le dise. La `migration deficit_weeks` étant jouée, le web écrivait en plus une colonne que le binaire ne lisait pas (inoffensif, le champ est ignoré, mais c'était la seconde moitié du même décalage). **Les deux moitiés sont refermées.** 📋 **Relevé de la mesure préalable** (`env:exec production` + export, `.env.local` ÉCARTÉ, `strings -a` sur le `.hbc`) : URL Supabase **1** · `sb_publishable_` **1** · `sk-ant-` **0** · témoins `deficit_weeks` et `highAdiposity` **présents** · `expo-router/entry` résolu **dans cet arbre**, pas via un worktree. ⚠️ **Et l'instrument a menti une fois avant de dire vrai** : passer 7,2 Mo de `strings` par une variable shell rend des compteurs **VIDES**, qui se lisent comme des zéros — donc « aucun secret » ET « aucun témoin », le relevé rassurant et le relevé alarmant d'un coup. ➡️ Écrire les chaînes dans un fichier et `grep -c` dessus, **et faire dire OUI à la mesure avant de la croire** (`Continuer` 1 / `zzz_inexistant` 0). *(Historique : la branche `production` était vide avant)* : `28dce9c7` (gestes des feuilles) · `98d5217a` (défilement ↔ fermeture) · `93fad600` (provenance du %MG + refonte design sans émoji, commit `7baa943`) — les trois du **2026-08-06** — puis **`3afe091f`** le **2026-08-07 vers 01 h 45** (budget du jour ↔ dépense du jour, feuille qui ne se fermait plus, passe design du 5 août ; commit `fcebfcf`, iOS + Android). puis **`9d625d00`** le **2026-08-07** (seuil 35/43 de la question de provenance + contrôles de mesure recalés ; commit `751dd86`, iOS + Android). puis **`3dd045fe`** le **2026-08-08** — la plus grosse à ce jour, **12 commits** : courses terminées + historique des listes, repas paramétrables, tuto 5 tours, rappel à l'heure libre, objectif daté à la date (commit `9bac59a`, iOS + Android). Runtime `1.0.0` → atteignent le build TestFlight **3**. ✅ **L'écart web/natif du 2026-08-07 est RÉSOLU** — il a duré ~14 h. La 4ᵉ OTA portait `fcebfcf`, donc pas le seuil 35/43 arrivé en `f4e9c6c` : le web posait la question de provenance au-delà de 35 %/43 %, l'app native sur toute saisie manuelle. La 5ᵉ OTA (`9d625d00`, commit `751dd86`) les a réalignés. ⚠️ **Cet écart naît à chaque fois qu'on déploie le web sans publier d'OTA** — les deux surfaces ne sont pas solidaires, et rien ne le signale. Le vérifier fait partie d'une livraison. 🔴 **UNE OTA SE PUBLIE DEPUIS `main`, JAMAIS DEPUIS LA BRANCHE QU'ON VIENT DE MERGER** — évité de justesse le 2026-08-08. `eas update` empaquette **l'arbre de travail**, pas ce qui est sur GitHub : la branche `courses-terminees-historique`, mergée cinq minutes plus tôt, était déjà en retard de **trois PR** (créneaux de repas, tuto, objectif daté). Publier depuis elle aurait RETIRÉ ces trois chantiers de l'app des testeurs, en quelques minutes, sans revue pour l'arrêter — une régression que rien dans la sortie de la commande n'aurait signalée, puisque le build aurait été parfaitement vert. ➡️ Se remettre sur `main` (`git checkout main && git merge --ff-only origin/main`), vérifier `HEAD == origin/main`, et **réinstaller les dépendances sur CET arbre** (`npm ci`) : un `node_modules` lié vers un autre worktree fait résoudre l'entrée par ce worktree-là (mesuré dans le panneau : `../../<autre-worktree>/node_modules/expo-router/entry.js`) — tolérable pour un aperçu, pas pour ce qu'on envoie à tout le monde. ⚠️ **Et écarter `.env.local` avant la mesure préalable**, sinon elle prouve que le fichier local marche, pas que les variables EAS alimentent le bundle. ⚠️ **`--environment production` est OBLIGATOIRE** (SDK 55+) : sans lui les variables serveur ne sont pas chargées et le bundle part **sans URL Supabase**. ⚠️ Mesurer le bundle AVANT de clore (`strings -a` sur le `.hbc` de `dist/`) : attendu **1 / 1 / 0** (URL Supabase, `sb_publishable_`, `sk-ant-`). ➡️ **Et mesurer AVANT de publier, pas seulement après** : `eas-cli env:exec production 'npx expo export …'` rend le même bundle sans rien envoyer. Une OTA atteint tout le monde en minutes sans revue — la vérifier après coup, c'est la vérifier trop tard. Ajouter au relevé une chaîne du chantier en cours (ici `body_fat_source` → **1**) : trois zéros attendus se lisent comme un succès même quand `strings` ne trouve plus rien du tout. 🔴 **Et ce témoin doit être ASCII PUR** — mesuré le 2026-08-06 : `strings` ne rend AUCUNE chaîne contenant un accent ou un `·`, donc presque aucun texte d'interface français. « Jour de repos · … » rend 0 tout en étant dans le bundle. Prendre un identifiant (`baseDayTargets`, `rest_weekdays`), jamais une phrase accentuée | `npx eas-cli channel:view production` |
| Ce qui traîne (tous worktrees) | **Relevé du 2026-08-15 : rien en suspens, nulle part** (`✓`), les trois arbres propres, **0 PR ouverte**. 🧹 **Ménage du 2026-08-15 : 82 branches supprimées** (44 locales, 38 distantes) — il ne reste que `main` et les deux branches verrouillées par un worktree. `gh-pages` est partie aussi, après avoir vérifié la config Pages (`build_type=workflow` sur `main`). Filet de restauration hors dépôt : `~/branches-Kyroz-supprimees-2026-08-15.txt`. 🔴 **ET « DES COMMITS EN RETARD ? » NE SE RÉPOND PAS EN COMPTANT DES COMMITS.** `git rev-list origin/main..<branche>` a rendu une trentaine de branches en rouge, et je les ai montrées avant de comprendre : après un **squash-merge**, les commits d'origine ne deviennent jamais ancêtres de `main`, donc toute branche déjà livrée paraît non fusionnée **à vie**. Pire, le `git diff` associé lisait comme « en avance » des branches simplement **en retard** — d'où des diffs à 17 000 lignes supprimées, alarmants et vides de sens. ➡️ **La réponse est dans les PR** : `gh pr list --state all` ; si `OPEN = 0` et que chaque branche en avance a une PR `MERGED`, rien n'est en retard. Ne restent à examiner que les PR `CLOSED` sans merge et les branches sans AUCUNE PR — ici 2 et 1, toutes trois vérifiées vides de contenu neuf. *(Historique du 2026-08-14 : rien en suspens non plus, les trois arbres propres.)* 🔴 **ET UN PIÈGE NOUVEAU, VU CE JOUR-LÀ** : après le merge, ce worktree s'est retrouvé sur une **vieille branche** (`claude/corrections-par-page-7a0afb`, 6 commits de retard) — sans rien perdre (aucun travail non commité, tout le contenu sur `main`), mais **l'arbre affichait du code périmé** au moment précis où le fondateur allait relire. La cause n'est pas établie (`gh pr merge --squash` a été employé SANS `--delete-branch`). ➡️ **Après tout merge, vérifier où est l'arbre avant de montrer quoi que ce soit** : `git log --oneline -1` + `git diff --stat origin/main HEAD`. Deux secondes, et c'est la différence entre relire ce qui est livré et relire ce qui ne l'est plus. ⚠️ `git status` seul ne le dit PAS — l'arbre était parfaitement propre. *(Historique : **Relevé du 2026-08-08 : 2 modifications en cours** (`AGENTS.md` + `CLAUDE.md` dans le dépôt principal, branche `docs/e1…)* |
| Site déployé | **automatique** : GitHub Actions à chaque push `main` (`build_type: workflow`). Routes **pré-rendues** (`web.output: "static"`, E7) → un lien direct répond 200. ⚠️ Le pré-rendu tourne dans **Node** : un module qui touche `window` au chargement casse le déploiement (CLAUDE.md §11). ⚠️ **NE PAS lire `origin/gh-pages`** — branche morte, cf. A12 | `gh run list --workflow=deploy.yml` |
| Auth — **ne pas y toucher** | ✅ **CHANTIER CLOS — la confirmation e-mail est ACTIVE.** Re-mesuré le 2026-08-10 (`npm run check:auth`) : provider e-mail **ouvert** · création de compte **ouverte** · connexion invité (anonyme) **ouverte** · **confirmation e-mail EXIGÉE**. 🔴 **Cette case annonçait encore « DÉSACTIVÉE » deux jours après la clôture du chantier (#64)** — le détail plus bas dans ce fichier, lui, était juste. C'est le tableau de TÊTE qui mentait, donc l'endroit le plus lu. ➡️ Une mesure qui vit à deux endroits périme d'abord à celui qu'on ne relit pas. *Historique du 2026-08-08 : la confirmation était alors désactivée (`mailer_autoconfirm: true`), volontairement, le temps que l'expéditeur soit posé.* ⚠️ **Ce « désactivée » n'est PAS une anomalie à corriger** — le code est en ligne (A29, PR #41 déployée), et la procédure impose *l'app d'abord, l'expéditeur ensuite, l'interrupteur en dernier*. Le fondateur pilote les étapes 2 et 3 lui-même. ➡️ **Ne pas relancer ce sujet, ne pas toucher à `claude/supabase-confirmation-email-c6b816`.** Le mot de passe oublié (A30) est livré et déployé ; il ne lui manque que son gabarit d'e-mail | `npm run check:auth` |
| Migrations Supabase | les **18** jouées — re-compté le 2026-08-15 (`ls supabase/migrations/*.sql`) et re-mesuré contre la prod (`✅ toutes reflétées`). ⚠️ Cette case annonçait **17** : la 18ᵉ (`2026-08-10_profiles_deficit_weeks.sql`, la pause à la maintenance) était jouée depuis cinq jours sans que la ligne bouge. *Un compteur écrit à la main périme sans que rien ne le dise.* Dont `2026-08-07_profiles_meal_slots.sql` comprise (jouée le 2026-08-07 AVANT le merge de la PR #46, mesurée avant ET après : 400 → 200 ; re-mesurée le 2026-08-08, toujours 200). Les 39 colonnes de `PROFILE_COLS` passent en une requête. ⚠️ **Ne jamais annoncer une migration « en attente » sans lancer la commande** — le dépôt ne sait rien de la prod, et deux lignes d'ici l'ont dit à tort pendant des jours | `npm run check:migrations` |
| Variété perçue | semaines servant 2 recettes d'un même couple : **max 8,8 %** — re-mesuré le 2026-08-07 sur 240 semaines (7,9 % avant la répartition par volume · 9,2 % avant D22 · 10,0 % avant D21 · 11,7 % avant B9 · 12,5 % avant B8 · 20,8 % avant B7 · 27,5 / 26,3 % avant A25 · 56,3 % avant D18) | `npm run mesure:variete -- --variete=…` |
| Variété perçue **par régime** | **vegan+SG 20,8 %** · vegan 10,4 % — re-mesuré le 2026-08-07 (la ligne annonçait 16,7 %, avant la répartition par volume). Trajectoire de la cible : **50 % → 35,4 % (B7) → 22,9 % (B8) → 16,7 % (B9) → 20,8 %** — c'est la seule de ces étapes qui REMONTE, et elle vient du moteur, pas du catalogue | `npm run mesure:variete -- --regime=vegan+SG` |
| Premier plan servi | plan **canonique** (seed 0) : **16,7 %** de semaines avec quasi-doublon — re-mesuré le 2026-08-07 (6,7 % avant la répartition par volume · 8,3 % avant D22 · 23,3 % avant B7 · **45,0 % avant A25**, où le 1er plan était le PIRE des trois). ⚠️ Le canonique encaisse plus que la moyenne : les jours de repos y descendent bas, et c'est là que le vivier végétal s'épuise. Voir la ligne « drapeaux » ci-dessous | `npm run mesure:variete -- --seeds=0` |
| Réglages inertes | **aucun parmi les 13 audités** — chacun change le plan servi (recettes et/ou portions), vérifié un par un. ⚠️ **Mais l'audit ne couvrait pas tout** : A27 a trouvé le 2026-08-03 que la rangée d'ÉCHÉANCES, absente de ces 13, servait le même plan sur ses 5 puces chez 5 gabarits sur 8. Un « aucun » ne vaut que pour le périmètre mesuré | `npm run mesure:reglages` + `npm run mesure:objectif` |
| Reroll (« Régénérer mon plan ») | 1ers repas qui changent : **repetitive 63,1 % · balanced 76,8 % · max 79,8 %** — re-mesuré le 2026-08-07 (la ligne annonçait 53,0 / 69,6 / 73,8 % ; 13,7 % pour tous avant A21). ⚠️ **Elle avait DÉJÀ été re-mesurée le 2026-08-03 et elle a redérivé en quatre jours.** Un chiffre de cette table se re-mesure avant d'être cité — celui-ci deux fois plutôt qu'une | `npm run mesure:reroll` |
| Anti-doublons | R1 **74** · R2 **71** · R4 14 · R5 **16** · R7 0 — **figés par un test** (`PLAFOND` dans `doublons.test.ts`), resserrés au constaté le 2026-08-03 puis déplacés par P3.4 le 2026-08-05. ⚠️ Cette ligne a annoncé « R1 81 · R2 70 » pendant deux jours alors que le TEST, lui, disait déjà 74/71 : le plafond du test est la source, pas cette case | `npm run check:doublons` |
| Drapeaux bloquants sur les repas SERVIS | 🔴 **25 sur 6 720** (240 semaines : 12 profils × 5 régimes × 4 tirages) — **0 avant la répartition par volume**, mesuré sur le même arbre. 19 `over_target_kcal` + 6 `protein_below_target`, dont **6 au plan canonique**. Ils sont **tous** sur deux gabarits (F 55 et F 65 en sèche), **tous** en vegan ou vegan+SG, et **tous les jours de REPOS** — les journées à 1 328 / 1 498 kcal, où le catalogue n'a ni dîner ni collation assez petits. ⚠️ **Ce n'est pas une régression de sélection, c'est une limite de vivier que le volume a rendue visible** : jusqu'ici tous les jours se valaient, donc aucun ne descendait assez bas pour la toucher. ➡️ Levier : petits formats vegan / vegan+SG (voir D-catalogue). Le dernier drapeau d'avant — `rep10` — était tombé avec D20 | `npm run mesure:variete` |
| Sous le seuil R8 | ⚠️ petit-déj **36/122** · repas complets **69/280** · collation **4/110** = **109** — re-mesuré le 2026-08-07 (37 / 70 / 5 avant) ; B7 (30), B8 (8) et B9 (8) livrées, catalogue **512** | `npm run mesure:seuils` |
| Ce que ça coûte au SERVICE | **688 repas servis sur 10 752 (6,4 %)** viennent d'une recette sous le seuil — re-mesuré le 2026-08-07 (675, 6,3 % avant) ; **935 (8,7 %) avant B7**, 633 (5,9 %) avant D20, 611 (5,7 %) avant D21. ⚠️ **D21 a fait BAISSER le nombre de recettes sous le seuil (115 → 111 → 109) et MONTER le nombre de repas qui en viennent** : les rescapées sont servies plus souvent. Les deux chiffres disent des choses différentes, ne pas lire l'un pour l'autre. ⚠️ B9 l'avait fait remonter depuis 5,3 % : un format volontairement étroit fait BAISSER une moyenne par recette tout en améliorant la couverture réelle | `npm run mesure:vivier` |
| Vivier vu par UN utilisateur | croisement gabarit × **régime** × créneau. Les cellules les plus pauvres restent vegan/vegan+SG. Pire : collation · F 55 sèche · vegan+SG = **8 recettes, 7 familles** — c'était 9 et 8 le 2026-08-06, et **3 et 2** avant B7. Juste derrière : repas complet · F 55 sèche · vegan+SG = **11 recettes**. ⚠️ Cette cellule bouge quand les TAGS ou les CIBLES bougent, sans qu'aucune recette ne change : `ciblesDe` reconstruit les cibles depuis les repas réellement servis — et depuis le 2026-08-06 ces cibles diffèrent d'un jour à l'autre | idem |
| Moyenne R8 par créneau | petit-déj **8,84/12** · repas complets **8,85** · collation **6,80** — re-mesuré le 2026-08-07 (8,54 / 8,72 / 7,00 avant · 8,67 / 6,91 avant D22 · 8,55 / 8,61 / 6,72 avant D21 · 8,27 / 8,51 / 7,38 avant B7 · 7,62 avant D18 · 7,19 avant B6 · 4,52 avant B5). ⚠️ Les deux premiers MONTENT et la collation BAISSE : la répartition par volume a écarté les cibles des jours, ce qui sert les créneaux à large enveloppe et resserre celui qui n'en a pas | idem |
| Vegan | petit-déj **56/122** · repas **89/280** · collation **67/110** — comptage CATALOGUE (`restrictions_ok`) | compter `restrictions_ok` par créneau |
| Vegan + sans gluten | petit-déj **42/122** · repas **49/280** · collation **57/110** | idem |

🔴 **NEUF LIGNES DE CETTE TABLE ONT ÉTÉ RE-MESURÉES LE 2026-08-07, ET SEPT AVAIENT
BOUGÉ.** Le motif compte plus que les chiffres : personne n'avait menti, chaque ligne
avait été juste le jour où elle a été écrite. Ce qui les a déplacées est presque
toujours **un changement AILLEURS** — la répartition par volume (2026-08-06) déplace
les cibles de chaque jour, donc la sélection, donc la variété, donc les seuils, donc
le vivier. Une seule ligne était une simple omission (`ENGINE_VERSION`, restée à 45).
➡️ **Quand un chantier touche les CIBLES, il périme cette table entière, pas la case
qui parle de lui.** Le budget de re-mesure fait partie du chantier.

⚠️ **Et un INSTRUMENT s'est mis à mentir dans l'intervalle** — corrigé le 2026-08-07.
`scripts/mesure-reglages.ts` comparait encore le total d'une journée à `target_kcal`,
la cible PLATE. Il annonçait donc **7,00 %** d'écart calorique là où le moteur en sert
**0,18 %** : une perte de précision de 20× qui n'existe pas, sur un contrôle dont
l'énoncé est « garder le seed coûte-t-il en qualité ? ». `mesure-variete.ts` avait reçu
le correctif le 2026-08-06 ; son jumeau, non. ➡️ **Quand une référence change, chercher
TOUS ses lecteurs** — `grep -rn 'target_kcal' scripts/` prend deux secondes et les
donne tous. Un contrôle qui accuse le moteur d'une régression de 20× serait cru.

**Les trois chantiers catalogue du 2026-08-03** — **D20** (`rep10` réécrit : le drapeau
bloquant était un défaut de DENSITÉ, pas de quantité), **D21** (la pesée sèche contre les
instructions : 47 recettes, et le contrôle qui manquait), **D22** (les tags qu'on croyait
décoratifs : `objectif` rendu mécanique, `recup_jour_repos` supprimé, `sport` retiré de
l'affichage). Ils s'enchaînent : chacun a été ouvert par ce que le précédent avait mesuré
et mis de côté.

**Les six chantiers du 2026-08-02, dans l'ordre où ils se sont enchaînés** — chacun a sa
fiche : **D14** (lot B4, 32 recettes à l'enveloppe corrigée), **D15** (lot B5, 23
collations réécrites), **D16** (plancher protéique par repas, dans le moteur), **D17**
(lot B6, 7 collations vegan — la dette laissée par B5), **D18** (rotation par famille,
dans le moteur — la variété perçue), **D3** (le champ « aliments à éviter » réparé).

**Puis une session « terrain » le même jour (A11 → A20)** — le fondateur teste le lien
déployé et remonte ce qu'il voit. Ce qui en sort tient en une leçon : **ce qui était
cassé ne l'était jamais là où on le croyait.**
- **A11** l'app se figeait au démarrage · **A16** `Alert.alert` est une fonction VIDE sur
  le web (dix interactions mortes, dont le refus d'un profil inéligible) · **A13** le
  champ %MG se réécrivait sous les doigts · **A14** l'objectif daté annonçait une date
  intenable, avec **A15** laissé ouvert (question de pilotage) · **A17** date de
  naissance (l'âge ne pourrit plus) · **A18** le dépistage santé n'avait pas de « Non » ·
  **A19/A20** allègement du Profil, le suivi du poids passe devant la série ·
  **A21** « Régénérer mon plan » resservait le même plan · **A22** deux champs de
  profil hors barème, dont un qui TUAIT un écran de réglages · **A23** le réglage de
  variété ne pilotait pas le reroll · **A24** le plan régénéré était JETÉ au réglage
  suivant · **A25** le premier plan servi était le moins varié des trois ·
  **A26** régénérer OUBLIAIT ce qui avait déjà été mangé — 1 448 kcal en moyenne.
- **A12** est le méta-enseignement, et c'est un **diagnostic FAUX** conservé en entier :
  « le site a un mois de retard » reposait sur la date de `origin/gh-pages`, **branche
  morte** qui ne sert plus rien. Le site se déploie par GitHub Actions à chaque push sur
  `main`. ➡️ **Vérifier la fraîcheur avec `gh run list --workflow=deploy.yml`, jamais
  avec `origin/gh-pages`.** Et se méfier d'un contrôle qui semble probant : le hash de
  bundle ne départageait rien (`expo export` est déterministe).
- Trois de ces correctifs sont des **pièges de plateforme** invisibles à la relecture
  (`Alert` vide, `onEndEditing` no-op, synchro descendante qui écrase la frappe). Ils
  sont désormais dans `CLAUDE.md` §11, deux d'entre eux tenus par un test.
- **A21 → A23 forment une chaîne, et c'est la partie la plus instructive de la session.**
  Le même bouton a été « réparé » trois fois. A16 corrige une vraie cause (`Alert` mort)
  et le bouton reste inerte — **on avait vérifié la mécanique, pas le résultat**. A21
  trouve la vraie cause (le seed n'arbitrait rien) et introduit au passage une régression
  qu'aucune de mes mesures ne voyait — **mesurer le renouvellement ne dit rien de la
  répétition**. A22 découvre que l'écran de réglages CRASHAIT depuis toujours sur une
  donnée hors barème, ce qui rendait le réglage inaccessible. A23 découvre que ce réglage,
  une fois accessible, **n'agissait pas** sur ce bouton. ➡️ Quand le fondateur RE-signale
  quelque chose de « corrigé », le premier diagnostic était juste mais INCOMPLET : ne pas
  rechercher la même cause, chercher l'étage suivant.
- **A24/A25 sont la suite de cette chaîne, et elles ont été trouvées SANS que le fondateur
  signale quoi que ce soit** — il a simplement dit « cherche donc l'étage suivant ». La
  méthode qui les a sorties tient en une phrase : **ne pas relire le code, basculer chaque
  réglage et regarder le plan qui sort.** Deux axes, `npm run mesure:reglages` :
  1. *Chaque réglage change-t-il vraiment quelque chose ?* → **aucun réglage inerte** sur
     les 13. Résultat NÉGATIF, et il compte : la classe de bug d'A23 ne se répète nulle part.
  2. *Que devient le plan choisi après coup ?* → A24. Le reroll marchait ; ce qui arrivait
     APRÈS le détruisait.
  ➡️ **Un bouton réparé n'est pas un bouton utile.** Vérifier aussi ce que devient son
  résultat — aucune mesure de reroll ne pouvait voir A24, elles comparaient des rerolls
  entre eux et le reroll était parfait.
- ⚠️ **A25 est arrivée par un chiffre qui allait dans le « mauvais » sens.** En vérifiant
  qu'A24 ne coûtait rien en qualité, un contrôle s'est AMÉLIORÉ trop franchement (semaines
  avec quasi-doublon : 45 % au canonique contre 20 % au régénéré). Un gain inexpliqué est
  une anomalie au même titre qu'une perte : ici il disait que le premier plan servi était
  le plus mauvais des trois. ➡️ **Ne pas empocher un résultat favorable sans l'expliquer.**
- 🔎 **Ces `.md` ont été AUDITÉS contre le code le 2026-08-02, et l'audit a trouvé sept
  affirmations fausses — dont trois écrites le jour même.** Écrire soigneusement ne suffit
  pas ; il faut confronter. Ce qui a été corrigé, par ordre de gravité :
  1. **D19 annonçait qu'un repas hors cible est servi au plan canonique.** Faux — le
     canonique est à ZÉRO drapeau. Ce repas n'apparaît qu'au réglage 0,04, qui n'a PAS été
     retenu. Un agent ouvrant B7 là-dessus serait parti chasser un défaut inexistant.
  2. **`CLAUDE.md` présentait deux propriétés « NON NÉGOCIABLES » du nudge de famille qui
     ne sont plus vraies** (« il n'exclut jamais », « pas en points de score ») : elles
     dataient de D18, avant qu'A21 et A25 ne fassent entrer la famille dans le score. Un
     lecteur s'y fiant aurait refusé un mécanisme **déjà en place**.
  3. Une constante attribuée à la mauvaise fiche (A22 au lieu d'A21), `37/70` au lieu de
     `37/74` dans la consigne même qui dit de se méfier de ce chiffre, `intégrité 100`
     pour un catalogue à 466, et `27,9 %` donné pour l'état courant en `CLAUDE.md`.
  ➡️ **Une doc écrite de bonne foi dérive quand même** — surtout ses tableaux « avant /
  après » et ses blocs « non négociable », qui vieillissent au premier correctif suivant.
  Six autres signalements ont été REJETÉS après réfutation (notes historiques prises pour
  des erreurs, omissions de style) : l'audit doit avoir une passe adverse, sinon il
  réécrit du vrai.

⚠️ **Trois de ces six ont commencé par une fiche FAUSSE, et c'est le motif à retenir.**
D4 demandait de désaturer un compteur de catalogue : le premier coupable mesuré était un
groupe de 2 recettes, invisible de ce compteur, et le défaut était dans le moteur. D3
partait du sésame du `tahini` : c'était le seul allergène que le filtre attrapait déjà.
D5 et D7 avaient déjà connu ça. ➡️ **Mesurer ce que l'utilisateur reçoit AVANT d'exécuter
une fiche, même quand elle a l'air cadrée.** Trois des cinq derniers chantiers auraient
produit du travail inutile si on avait fait confiance à leur énoncé.

⚠️ **LES CHIFFRES R8 ONT BOUGÉ LE 2026-08-02 SANS QUE LE CATALOGUE CHANGE.** Repas
complets sous le seuil 71 → 74, collations 1 → 3, et le « vivier servable » de la
collation a fait le yo-yo (F 55 sèche **54 → 30**, mais F 65 sèche **38 → 58**). Cause :
A21/A23 ont modifié les plans des seeds ≠ 0, or les cibles de l'audit sont RECONSTRUITES
depuis des plans générés (`ciblesDe`) — donc changer le moteur déplace la règle avant de
mesurer la copie. **Vérifié contre le moteur d'avant** : les mouvements vont dans les deux
sens, ce n'est pas une régression. La collation encaisse le plus parce qu'elle est servie
en dernier et absorbe la dérive du jour. ➡️ Ne jamais lire une variation de ces lignes
comme un effet catalogue sans avoir rejoué la mesure sur les DEUX moteurs.

⚠️ **LE PIÈGE DE MESURE À CONNAÎTRE AVANT DE TOUCHER AU CATALOGUE.** Le « vivier servable »
(nombre de recettes atteignant la cible d'un profil) **n'est pas stable d'une vague à
l'autre** : les cibles de l'audit sont reconstruites depuis des plans réellement générés,
donc ajouter des recettes déplace les cibles. Mesuré trois fois : `H 110 masse` en repas
complet valait 79/250 avant B4, 85/270 après, **70/270 après B5 — qui n'a pourtant touché
que des collations**, et 74/270 après D16. ➡️ **Ne jamais annoncer le gain d'une vague en
additionnant les recettes conformes : re-mesurer le catalogue ENTIER après merge.**

⚠️ **Quatrième occurrence, et elle vaut mieux qu'un long discours** : B5 avait ramené le
créneau collation à **0 recette sous le seuil R8**. D16 — un correctif du MOTEUR, qui n'a
touché aucune recette — en a remis **2** dessous (`col07` yaourt grec, `col38` tartine
avocat-œuf, toutes deux à 2/12) tout en faisant MONTER la moyenne de 6,90 à **7,19/12**.
➡️ **« Zéro sous le seuil » n'est pas un état stable et ne doit pas être poursuivi comme
tel.** Le repère à suivre est la MOYENNE et la distribution, pas le compteur de queue :
courir après les deux dernières recettes en déplace deux autres. Les deux fautives sont
d'ailleurs des cas d'école du §4.12 du brief (`yaourt_grec` à 12,8 kcal/g de protéine,
et une tartine avec un `vegetable` à poids fixe).

⚠️ **Cinquième occurrence, dans l'autre sens — et c'est la même leçon.** B6 a ajouté
**7 collations et n'a touché à aucune existante** ; `col38`, restée identique, est
repassée AU-DESSUS du seuil toute seule, et le vivier collation de `F 70 masse` a bondi de
**36 à 54 sur 86**, soit bien plus que les 7 recettes ajoutées. ➡️ **Un gain mesuré après
merge n'est pas imputable en entier à la vague** : le déplacement des cibles en fabrique
une partie. Le seul chiffre honnête est celui du catalogue ENTIER, avant et après, et il
faut dire les deux.

⚠️ **Ce que le produit sert réellement** : **zéro drapeau bloquant** (`over_target_kcal`,
`under_target_kcal`, `protein_below_target`) — re-vérifié le 2026-08-03, toujours 0 sur
10 752 repas servis (`npm run mesure:variete`). Les « viviers » ci-dessus sont une réserve
de variété, **pas** ce que l'utilisateur reçoit : ne pas les présenter comme un défaut de
service.
⚠️ **Deux chiffres de précision calorique circulent dans ce fichier, et ils ne mesurent
pas la même chose** : « 0,05 % » vient d'un balayage ad hoc d'une fiche (1 344 repas, sans
commande dédiée, donc PAS re-mesurable tel quel) ; `npm run mesure:variete` affiche
**0,34 %** d'écart moyen du jour sur 1 680 jours. Citer celui qui a une commande.

### ▶️ Si tu reprends maintenant — le chantier prêt (mais REPORTÉ par le fondateur)

> 📌 **Mise à jour du 2026-08-03 (fin de journée).** Trois chantiers catalogue ont été
> livrés dans la foulée, chacun a sa fiche : **D20** (`rep10` réécrit — zéro drapeau
> bloquant), **D21** (47 recettes dont la pesée sèche contredisait les instructions), et
> **D22** (`tags.objectif` rendu mécanique, `recup_jour_repos` supprimé, `tags.sport`
> retiré de l'affichage). La section ci-dessous reste valable pour son propos — les vagues
> B7 → B9 — mais elle est ANTÉRIEURE à ces trois-là.
>
> **Ce qui est ouvert côté catalogue**, dans l'ordre où je le prendrais :
> 1. **Les 4 recettes à ZÉRO profil servi** en petit-déj (`pd04`, `pd11`, `pd37`, `pd64`)
>    et 4 en repas complet (`rep18`, `rep51`, `rep137`, `rep144`) — 13 des 37 petits-déj
>    sous le seuil n'ont **aucun ingrédient `carb`** (moyenne 2,77 contre 9,23 avec).
>    C'est le même défaut de forme, pas 37 problèmes distincts.
> 2. **Les recettes que D21 a rendues moins denses** (`col37`, `pd20`, `rep142`) : la
>    conserve est moins protéinée que le sec, c'est inhérent — elles se réécrivent façon
>    D20, elles ne se rattrapent pas à la quantité.
> 3. **`temps_min` n'est plus qu'un affichage** depuis le 2026-07-29. Si le curseur temps
>    doit revenir, c'est en préférence pondérée, jamais en filtre dur (cf. planEngine).

*(D7 est **FERMÉ** par le lot B6, cf. D17 · D4 est **FERMÉ** — la tâche mesurait le mauvais
objet, le défaut réel était dans le moteur, cf. D18 · D3 est **TRANCHÉ ET CORRIGÉ** : pas
d'axe allergène, le chemin « aliments à éviter » réparé, cf. D3 · C1, le layout tablette,
est **FERMÉ** le 2026-08-01, `supportsTablet` est à `true`.)*

1. ~~**🤖 B7 — l'audit R8 des deux créneaux qui ne l'ont jamais eu**~~ ✅ **LIVRÉ le
   2026-08-03** (fondateur : « on va enrichir les recettes dont on a besoin », puis
   « je les génère ici »). **30 recettes végétales**, catalogue 466 → 496 :
   `b7-pdej` (12) · `b7-repas` (10) · `b7-coll` (8). Résultats mesurés :
   - part des repas servis venant d'une recette sous le seuil : **8,7 % → 5,3 %** ;
   - pire cellule du catalogue (collation · F 55 sèche · vegan+SG) : **3 recettes /
     2 familles → 7 / 6** ; petit-déj · H 110 masse · vegan+SG : **12 / 9 → 21 / 18** ;
   - moyennes R8 : petit-déj 8,27 → **8,55** · repas complets 8,51 → **8,63** ·
     collation 7,38 → **6,99** ⚠️ (cf. le piège de mesure ci-dessous).
   🔁 **Écrites ICI, pas en conversation externe** — première fois. Ce que ça change,
   mesuré : **2 recettes sur 3 sortaient des bandes au premier jet**, et 6 sur 30 ont dû
   être RÉÉCRITES après contrôle (doublon R1/R2, seuil R8, ancre à son plafond). Chaque
   recalage a coûté une seconde au lieu d'une conversation. ➡️ Le brief reste la bonne
   commande ; c'est la BOUCLE qui gagne à être locale.
   ➕ **B8 (8 collations vegan + sans gluten) a suivi le 2026-08-03**, catalogue 496 → 504.
   Motif : après B7, `vegan+SG` restait à **35,4 %** de semaines avec quasi-doublon quand
   les autres régimes étaient à 6 %. Isolé avec `mesure:variete -- --regime=vegan+SG`
   (option ajoutée pour ça) : **15 des 18 collisions étaient des COLLATIONS**, et 9
   venaient d'une seule famille — `yaourt_soja_proteine × ∅`, huit yaourts de soja sans
   féculent. Résultat : **35,4 % → 22,9 %**, et la pire cellule passe de 7 recettes /
   6 familles à **9 / 8**.
   ⚠️ **Deux fausses pistes écartées APRÈS mesure — ne pas les rouvrir** (détail dans le
   commentaire de `b8-coll`, `scripts/gen-brief-lot.ts`) :
   1. **réécrire les 8 recettes fautives** pour leur ajouter un féculent — elles passent
      TOUTES R8 (5 à 10 sur 12) et ne pèsent que 1,5 % des repas servis : on échangerait
      8 recettes saines contre quelques points de métrique ;
   2. **changer `familyKey`** pour que le fruit tienne lieu de second axe quand il n'y a
      pas de féculent — mesuré, `vegan+SG` tomberait de 33,3 à 16,7 % **sans qu'un seul
      repas servi ne change**. C'est de l'habillage, pas une correction. Si le sujet
      revient, il se pose comme une question de PRODUIT, jamais comme un correctif.
   ➕ **B9 (8 collations GRAND FORMAT) a suivi**, catalogue 504 → 512. **Un format que le
   catalogue n'avait jamais eu**, et le signal traînait depuis trois lots : le contrôle
   d'union de `check:enveloppe` répétait « NON couverts : H 95 masse, H 110 masse » sans
   que personne ne le relève, parce que le lot passait quand même. Leur cible de collation
   vaut **402 et 458 kcal** — toutes les enveloppes écrites jusque-là plafonnaient à 320.
   Ces profils étaient servis par des recettes ÉTIRÉES, jamais par des recettes conçues
   pour eux. Résultat : `H 110 masse · vegan+SG` passe de **14 recettes / 11 familles à
   20 / 18**, vegan+SG de 22,9 à **16,7 %**, moyenne générale à **10,0 %**.
   🔎 **Et ça corrige une affirmation de B7-coll** : « sur la collation, le côté protéine
   est arithmétiquement fermé (4 ancres) ». Vrai du format LÉGER seulement. À 400 kcal la
   densité tombe à 5,5 g/100 kcal et **neuf ancres tiennent**, toutes à 3/3 gros gabarits
   servis. ➡️ **Le verrou n'était pas celui du créneau, mais celui d'un FORMAT** — devant
   un créneau qui paraît fermé, balayer l'enveloppe avant de conclure.
   ⚠️ **Deux contreparties, mesurées et assumées.** (1) La moyenne R8 de la collation
   descend de 6,96 à **6,73** et 7 recettes passent sous le seuil : un format volontairement
   étroit fait baisser une moyenne PAR RECETTE tout en améliorant la couverture réelle —
   c'est déjà la doctrine des sous-formats de B2 (« la vraie garantie n'est pas le score par
   recette mais l'UNION »). (2) **Un drapeau bloquant réapparaît** sur les repas servis, le
   premier depuis A25 : `H 110 masse · vegan+SG`, seed 2, `rep10` rend 40 g de protéines
   pour 44 demandés. Un repas sur 6 720, sur un plan RÉGÉNÉRÉ — **le plan canonique reste à
   zéro**, ce qu'exige A25. ✅ **Refermé le 2026-08-03 par D20** : le drapeau était le
   symptôme, `rep10` ne servait que 4 profils sur 12. Réécrite, elle en sert 11 et le
   compteur est retombé à **zéro sur 10 752 repas**.
   🐛 **Un défaut du moteur trouvé au passage, dormant depuis D16** : `tightenDay`
   rappelait `mealTarget` **sans le plancher protéique** (paramètre optionnel → 0), donc
   la passe de resserrage annulait D16 exactement dans le cas qu'il couvre. Pire cible
   protéique de la collation : **32 % → 67 %** de la part équitable, précision calorique
   inchangée (0,382 → 0,380 %). Corrigé, garde-fou `mealProteinFloor.test.ts`.
   Le diagnostic d'origine, pour mémoire : D15 avait audité les collations, jamais les deux autres créneaux —
   mesuré, **37 petits-déj sur 110 (34 %) et 74 repas complets sur 270 (27 %) sont sous le
   seuil de 8/12**, dont 4 à ZÉRO profil dans chaque créneau. Cause première déjà
   identifiée : les recettes **sans `carb`** (13 en petit-déj, moyenne 2,69/12 contre 9,02
   pour celles qui en portent un ; 6 en repas complet à 1,50/12 contre 8,67). Remède
   identique à B5 — réécrire, pas ajouter — et le lot est plus gros. Détail en **D19**.
   ⚠️ **Le chiffre bougera** : il a déjà bougé TROIS fois pendant qu'on l'écrivait — D18 a
   fait passer les repas complets de 70 à 71, puis A21/A23 de 71 à **74** (et la collation
   de 1 à **3**), puis A25 a déplacé les moyennes. Aucun des quatre n'a touché une recette : ce sont des correctifs du
   MOTEUR, et les cibles de l'audit sont reconstruites depuis des plans générés.
   **`npm run mesure:seuils` avant de commander**, ne jamais partir des chiffres écrits ici.

   🎯 **Ce que la session « terrain » du 2026-08-02 ajoute à la commande** — quatre limites
   mesurées qui ne se corrigeront PAS dans le moteur, et qui disent où viser :
   1. **Petit-déjeuner vegan à forte cible protéique : UNE seule recette du catalogue tient
      la cible** (profil 90 kg, 198 g de protéines, 2 614 kcal). Conséquence visible : la
      position est FIGÉE — régénérer son plan ne change jamais ce repas, et c'est le bon
      comportement (servir autre chose serait servir faux). C'est la seule position figée
      sur les 336 mesurées, et `lib/__tests__/reroll.test.ts` la documente comme telle.
   2. **« Variété max » ne peut pas dépasser « Équilibré » là où le vivier est mince** :
      les deux réglages ouvrent le même panier dès que le catalogue ne fournit pas assez de
      candidats comparables (mesuré : à panel réduit, 90,7 % de renouvellement pour les
      deux, au centième près). Le réglage tient sa promesse en proportion de ce qu'il y a
      à distribuer.
   3. **Les quasi-doublons restants sont concentrés sur le végétal** (mesuré à A25) :
      41,7 % des semaines en vegan contre 8,3 % sans régime — et **50 % en vegan+sans
      gluten des DEUX côtés**, canonique comme régénéré. Là, le moteur n'y peut plus rien :
      il n'y a pas assez de familles protéine × féculent distinctes pour tourner.
   4. **Le catalogue PLAFONNE la qualité du plan canonique** — sans le dégrader : il est à
      zéro drapeau bloquant, mais c'est lui qui a **interdit de monter
      `FAMILY_SELECT_W_CANON` à 0,04** (6,6 points de quasi-doublons abandonnés). À ce
      réglage, 1 repas sur 1 680 passe hors cible : une **collation vegan+SG en sèche**,
      sans alternative propre dans la bande. ⚠️ Ce repas n'est PAS servi aujourd'hui.
   ➡️ Les quatre pointent le même endroit : **le végétal**. ⚠️ Viser des **couples
   protéine × féculent NOUVEAUX** : ajouter une neuvième recette au yaourt de soja
   n'enlèverait aucun quasi-doublon. Familles saturées mesurées :
   `yaourt_soja_proteine`, `tofu_ferme × nouilles_riz`, `proteine_vegetale`,
   `edamame × maïs`, `seitan`, `tempeh`.

   ♻️ **Ce que la mesure du 2026-08-02 (`mesure:vivier`) a CORRIGÉ dans cette orientation,
   avant d'écrire les briefs.** Les quatre points ci-dessus disaient « petits-déjeuners et
   collations vegan riches en protéines ». Trois choses étaient fausses ou incomplètes :
   1. **Le repas complet manquait à la liste, et c'est la 3ᵉ cellule la plus pauvre** :
      une femme de 55 kg en sèche, vegan et sans gluten, a **4 repas complets sur 270**.
      Écrire « petit-déj et collation » l'aurait laissée dehors.
   2. **« Riches en protéines » est vrai en bas, faux en haut.** Le drapeau qui bloque
      n'est pas le même aux deux bouts : chez F 55 sèche tout est **trop gros**
      (`over_target_kcal`, 31 candidates sur 34) ; chez H 110 masse tout est **trop
      petit** (`under_target_kcal`, 21 sur 33 — sa cible de collation est à 3,2 g de
      protéines pour 100 kcal, l'inverse d'une recette protéinée). Une enveloppe unique
      ne répond pas aux deux ; c'est la COMPOSITION qui le fait.
   3. **Sur la collation, le côté PROTÉINE est arithmétiquement FERMÉ.** Balayé sur
      18 ancres végétales : à 190 kcal pour 15 g de protéines, seules
      `yaourt_soja_proteine`, `proteine_vegetale`, `soja_texture` et `seitan` laissent
      encore la place d'un vrai féculent. Tofu, tempeh, edamame et les 8 légumineuses
      consomment le budget calorique à elles seules et rendent 0 à 3 g de féculent —
      elles reproduiraient exactement le défaut « sans `carb` » que le chantier veut
      supprimer. ➡️ Sur ce créneau la variété se commande **sur le féculent**, pas sur
      l'ancre (`familyKey` = protéine × féculent : un féculent neuf fait bien une
      famille neuve). Commander « des ancres neuves en collation » aurait été une
      commande impossible à honorer.
      ⚠️ **Et l'élargissement évident est un piège — mesuré, puis abandonné.** Le réflexe
      devant ces 4 ancres est d'élargir le format léger pour en libérer d'autres. Ça
      marche… et ça perd la cliente. Balayé de 190/15 à 250/14 : à **190 kcal / 15 g P**,
      `yaourt_soja_proteine`, `soja_texture` et `seitan` servent `F 55 sèche · vegan+SG` ;
      **dès 210 kcal, plus AUCUNE ancre ne la sert**, quel que soit le gain de R8 (qui
      monte pourtant à 10/12). L'étroitesse de ce format n'est pas un défaut à corriger,
      c'est sa raison d'être. ➡️ Le vrai correctif était ailleurs : ouvrir `tempeh` sur le
      **gros** format seulement, où il garde 13 g de féculent — sans quoi le plafond de
      2 recettes par ancre ne laissait aucun degré de liberté (4 ancres × 2 = 8 places
      pour 8 recettes).
   ➡️ Et un argument qui décide de la composition du lot, mesuré et non supposé : **une
   recette végétalienne entre dans TOUS les pools de régime** — halal, pescatarien, sans
   lactose, végétarien, sans porc : **166 fois sur 166**. Ce n'est pas une orientation
   éditoriale (cf. la règle « végétal ≠ argument de vente »), c'est le seul type de recette
   qui ne laisse personne dehors à volume égal. C'est pourquoi les 30 recettes de B7 le sont.

⚠️ **Une décision produit attend le fondateur, et elle est réversible** : D3 a été tranché
**contre** l'axe allergène formel (motif : promesse de sécurité intenable sur un catalogue
générique). Si tu veux l'axe malgré tout, le socle `FOOD_FAMILIES` est déjà écrit.

⚠️ **Une mise en page tablette existe désormais** (`lib/layout.ts`, seuil 700 pt). Tout
nouvel écran doit passer par `useLayout()` : sans lui il repart en pleine largeur, et à
1024 pt c'est illisible. Le rendu téléphone, lui, ne bouge pas — `centered()` est un
no-op strict sous le seuil, et un test l'exige.

⚠️ **Pour commander une vague** : les huit lots de `scripts/gen-brief-lot.ts` sont tous
marqués `livre`, donc `npm run gen:lots` n'écrit plus rien. Il faut **ajouter un `Lot`**
dans `LOTS`, puis régénérer. Le générateur refuse d'écrire un brief incohérent
(`verifieCoherence`) : ids déjà pris, `ref` cité hors du §4, régimes qui ne font pas le
compte. **Une vague peut aussi RÉÉCRIRE** au lieu d'ajouter (précédent : B5) — la
convention est dans `Recette/README.md`.

⚠️ **Mais toutes les vagues ne passent pas par un brief.** B5 (23 réécritures) et B6
(7 ajouts) ont été écrites **en session**, sans passer commande : sous ~25 recettes très
contraintes, la boucle « écrire → `check:enveloppe` → corriger » est plus rapide qu'un
aller-retour, et surtout elle permet de MESURER chaque quantité au lieu de la deviner
(c'est comme ça qu'on a trouvé la 5ᵉ règle du §4.12). Le brief reste la bonne voie pour
les gros volumes, où c'est la variété éditoriale qui coûte, pas le calage.

## ⏳ CE QUI RESTE À FAIRE — la liste unique

> **C'est la SEULE liste de tâches de ce fichier.** Il y en avait trois jusqu'au
> 2026-07-30 — « Chantiers ouverts », « RESTE (Phase 2) », « BACKLOG PRIORISÉ » —
> écrites à trois dates, et elles se **contredisaient** : la tablette était à la fois
> « décidée » et « en attente, reco false » ; la monétisation à la fois « tranchée,
> plus rien en attente » et « prix non tranchés » ; la diététicienne à la fois
> « écartée, ne plus la remonter » et « contacter 2-3 diététiciennes ».
>
> Les trois anciennes listes sont conservées dans le **Journal** en fin de fichier,
> comme trace de ce qui a été fait. **Ne rien y prendre comme une consigne.**
>
> 🧑 = seul le fondateur peut le faire (identité, argent, accès, device) · 🤖 = codable en session.

### 🔴 A — En retard ou cassé en silence

- ✅ **A33 · MON DIAGNOSTIC ÉTAIT FAUX — et c'est LUI qui vaut d'être gardé
  (2026-08-12, corrigé le 2026-08-14)**
  J'ai annoncé au fondateur qu'un correctif mergé le 11 août « n'était jamais parti
  en OTA » : le retrait de la citation de 104 caractères, avec le passage de 15 à
  45 citations. **C'était faux.** Les commits `145065b` et `8dac3c7` sont bien
  ancêtres de l'**OTA #11** (`b3edfa0`, publiée le 2026-08-11) ; ce bundle porte
  **45 citations** et **zéro** occurrence de la citation longue.
  🔴 **LA CAUSE DE L'ERREUR EST LA SEULE CHOSE À RETENIR : j'ai mesuré contre un
  DOCUMENT, pas contre le canal.** J'ai pris le dernier identifiant d'OTA dans la
  ligne « OTA publiées » de l'AGENTS.md **de ma branche** — qui datait d'avant le
  merge de la PR #101 et s'arrêtait à la 10ᵉ. Le `git merge-base --is-ancestor`
  était juste ; sa cible était périmée. Une mesure exacte sur la mauvaise référence
  rend un résultat faux **avec l'autorité d'un chiffre**.
  ➡️ **La source de vérité d'une publication est le CANAL, jamais une ligne de
  `.md`** : `npx eas-cli channel:view production` répond en deux secondes et ne
  peut pas être en retard d'un merge. Un fichier versionné décrit l'état du monde
  au moment où quelqu'un l'a écrit, dans SA branche.
  ⚠️ Corollaire pour les branches longues : tout ce qu'un `.md` affirme du DÉPLOYÉ
  (OTA, build, migrations) est suspect dès que la branche a plus d'un jour. Les
  faits du dépôt vieillissent avec la branche ; les faits du serveur, non.
  ℹ️ **Ce que le signalement du testeur voulait vraiment dire** : la citation longue
  n'était plus dans le bundle servi, mais sa notification, elle, était **programmée
  avant**. Un déclencheur `DAILY` rejoue son contenu figé indéfiniment, et seule une
  ouverture de l'app le renouvelle — installer l'OTA n'y change rien. La cause était
  donc **entièrement** A34, et le correctif d'A34 la referme.

- ✅ **A34 · Le rappel quotidien ne tournait que pour qui OUVRE l'app — CORRIGÉ le
  2026-08-12** (`75ab678`, décision fondateur), **publié dans l'OTA #12 du
  2026-08-14**.
  Le contenu d'une notification est **figé à la programmation** : le système ne
  redemande jamais à l'app quoi écrire. Avec UN déclencheur `DAILY` qui se rejoue
  seul, le texte ne changeait qu'au ré-armement, donc qu'à l'ouverture de l'app.
  Qui décroche recevait la même phrase pendant des semaines — **exactement la
  personne que le rappel existe pour ramener**.
  ✅ **Renversement d'arbitrage assumé** : une SÉRIE DATÉE de 30 notifications, une
  par jour, chacune portant déjà son texte (`reminder.ts::serieQuotidienne`, pur
  donc testé). L'argument qui avait écarté cette option en son temps — « un rappel
  qui lâche vaut moins qu'un message qui se répète » — est renversé : une
  notification identique chaque matin n'est pas un rappel, c'est du bruit, et le
  bruit finit en **notifications coupées**, ce qui est pire que l'extinction qu'on
  voulait éviter.
  ⚠️ **Coût assumé** : sans ouverture pendant 30 jours, le rappel s'éteint. Le
  ré-armement au démarrage CHANGE DE RÔLE — il ne fait plus tourner le texte, il
  **recharge la fenêtre**. Le supprimer en croyant nettoyer du code devenu inutile
  ferait expirer le rappel de tout le monde, un mois plus tard, en silence.
  🔴 **30 vient d'un BUDGET** : iOS ne garde que **64 notifications en attente** par
  app et jette les plus lointaines **sans erreur**. La pesée en réserve déjà 7. Un
  test fige l'arithmétique.
  🔴 **Et le parc déjà armé est DÉSAMORCÉ** : `kyroz-daily-reminder` nu est
  l'identifiant que portent tous les appareils installés, et sa notification est
  `DAILY` — elle se rejoue toute seule, sans l'app. L'oublier n'aurait pas fait un
  doublon d'un jour : l'ancienne citation figée serait tombée tous les matins **à
  côté** de la nouvelle série, pour toujours. Même piège que `WEIGH_ID` nu (E38),
  même remède. **Vérifié par 5 mutations.**
  ⚠️ **Deux pistes écartées en les MESURANT**, à ne pas re-explorer : le format de
  stockage de l'heure (migré par `ANCIENS_CRENEAUX`, donc pas de rappel fantôme),
  et l'identifiant de notification (`kyroz-daily-reminder` n'a jamais changé, donc
  le ré-armement annule bien l'ancienne).

- 🧑 **A32 · Les 12 silhouettes du sélecteur de %MG sont à REFAIRE avant la mise en
  ligne (2026-08-12)** — décision fondateur, il cherche un outil qui rende de bons
  assets. Les images servies portent une « corne » au-dessus des épaules, visible sur
  les six cartes, qui se lit comme un défaut de modèle 3D.
  🔴 **LE DÉFAUT EST DANS LA SOURCE, ET AUCUNE RE-DÉCOUPE NE LE RATTRAPE — mesuré.**
  Sur `assets/bodyfat/_source/*-models.png`, les facettes ombrées du cou et des
  trapèzes valent **exactement** le gris du fond (écart 1 à 3 par canal sur 255).
  Donc : aucun critère de COULEUR ne peut séparer deux choses de la même couleur ; et
  le critère de CONNEXITÉ (diffusion depuis les bords, pourtant le bon en théorie)
  fuit dans le corps par le haut des épaules aux tolérances **4, 6, 8 ET 10** — 1 410
  pixels dès la plus stricte. ➡️ **Ne pas repartir sur « mieux régler le seuil » : ce
  chemin est mesuré et fermé.**
  ✅ **Ce qui est prêt côté dépôt** : `scripts/decouper-silhouettes.py` (Pillow, mode
  aperçu par défaut, `--ecrire` pour remplacer) mesure lui-même la bande et les six
  colonnes, pose un canevas commun, aligne les socles et garde **une seule échelle**
  pour les douze. Le jour où les planches sont bonnes, la découpe est une commande.
  📋 **Ce qu'il faut exiger du nouveau jeu** (détail : `assets/bodyfat/_source/README.md`) :
  **fond contrasté ou PNG déjà transparent** (le point unique qui débloque tout) ·
  une planche par sexe, mêmes 6 paliers · **même cadrage et même échelle** d'un palier
  à l'autre, sinon on perd la seule information du sélecteur (un corps à 35 % est plus
  large qu'un corps à 10 %) · ni titre, ni libellés, ni watermark.
  ⚠️ Une piste écartée en séance : servir des **tuiles au fond gris plat** au lieu de
  détourer. Techniquement propre (les pixels ambigus gardent leur teinte, donc
  l'erreur devient invisible) et vérifié en aperçu — mais c'est un changement de DA
  (un rectangle clair dans une carte sombre), et le fondateur préfère de vrais assets.

- 🧑 **A30 · Mot de passe oublié — CODE EN LIGNE, reste UN geste hors dépôt (2026-08-07)**
  ✅ **Mergé (PR #43) et déployé le 2026-08-08** — `main` `085166d`, run de déploiement
  vert, écran vérifié sur le bundle réellement servi (« Recevoir un code » **2**,
  « Ce mot de passe est déjà le tien » **1**). Il ne reste que le **gabarit
  `supabase/emails/reinitialisation.html` à coller** dans le dashboard (procédure,
  étape 7 bis) : sans lui l'e-mail part quand même, mais avec l'habillage Supabase par
  défaut. ⚠️ Passée de 🔴 à 🧑 le 2026-08-08 : le rouge se lisait « cassé ou en retard »
  alors que le code est servi — ce qui reste demande un accès dashboard, pas une session.
  ⚠️ *Numérotée **A29** à l'écriture — un choix qui était JUSTE au moment où il a été
  fait (la confirmation e-mail était `A28`, celle-ci prenait la suite). Elle est
  renommée **A30** parce que la résolution du conflit de `A28` l'a déplacée en `A29`,
  sans regarder les PR EMPILÉES au-dessus. **Renuméroter dans une pile propage la
  collision au lieu de la clore** : le numéro doit être choisi en regardant `main` ET
  les branches en aval. Troisième collision de la journée, cf. E19/E20 et A28/A29.*
  `resetPasswordForEmail` n'était appelé **nulle part**, et l'écran de connexion ne
  proposait rien : **un mot de passe oublié = un compte perdu**, sans autre issue que
  d'écrire à `contact@kyroz.app`. Repéré en livrant A29 (la confirmation e-mail), hors de son périmètre.

  **Livré** — trois étapes dans `components/MotDePasseOublie.tsx` (demander le code ·
  le vérifier · poser le nouveau mot de passe), branché depuis `login.tsx` par un lien
  **« Mot de passe oublié ? »** visible en mode Connexion seulement. Même mécanique
  que A28 : code à 6 chiffres, `verifyOtp({ type: 'recovery' })`, puis `updateUser`.
  Gabarit `supabase/emails/reinitialisation.html` — **à coller** (procédure, étape 7 bis).

  🔴 **L'e-mail de réinitialisation ne porte AUCUN lien, et c'est une décision.**
  Cliquer un lien de recovery **consomme** le jeton **sans** changer le mot de passe :
  une page statique ne peut pas appeler `updateUser`, et la session ainsi ouverte vit
  dans le navigateur, jamais dans l'app. La personne se retrouverait avec son ancien
  mot de passe ET un code mort — **pire qu'avant sa demande**. Les antivirus de
  messagerie qui pré-cliquent les liens le provoqueraient à chaque envoi. Le code seul
  n'a pas ce défaut : rien à cliquer, rien à consommer.
  ⚠️ Corollaire : les messages d'erreur de ce parcours sont SÉPARÉS de ceux de la
  confirmation (`traduitErreurReinitialisation`). Réutiliser les autres conseillerait
  « si tu as déjà cliqué le lien… » — un geste impossible ici, donc un mensonge.

  ⚠️ **Anti-énumération assumée** : on passe à l'écran de saisie **même si l'adresse est
  inconnue**, et le message reste au conditionnel (« si un compte existe »). Afficher
  « aucun compte » ferait de ce formulaire un outil pour savoir qui est inscrit chez
  Kyroz. Prix payé : qui se trompe d'adresse attend un code qui ne viendra pas.

  🔴 **DEUX DE MES PROPRES TESTS ÉTAIENT FAUX, et c'est l'enseignement de la session.**
  Ils lisaient le fichier ENTIER — or un fichier bien commenté **cite** les chaînes que
  le test cherche. `useAuth.tsx` explique « `type: 'recovery'` — surtout PAS 'signup' » :
  supprimer l'appel réel laissait donc une occurrence, dans la ligne qui interdit de le
  supprimer. **Le commentaire se portait garant du code qu'il décrit.** Idem pour les
  gabarits (l'en-tête liste les variables obligatoires) — le garde-fou `{{ .Token }}` de
  A28 était donc, lui aussi, un faux positif. Et un troisième : `resetPasswordForEmail\([^)]*\)`
  s'arrêtait à la parenthèse de `email.trim()`, donc ne voyait jamais les options.
  ➡️ Depuis : `sansCommentaires` / `sansCommentairesTS` avant toute recherche de chaîne.
  ➡️ **Aucune des trois ne s'est vue à la relecture** — les mutations initiales frappaient
  le fichier entier, commentaire compris, donc elles rougissaient pour la mauvaise raison.
  **Une mutation doit frapper là où le code vit, pas là où il est décrit** ; sinon elle
  valide le test qu'elle est censée mettre à l'épreuve. Les 8 garde-fous ont été
  re-mutés ligne par ligne, avec un contrôle imprimé que la mutation avait bien pris.

  ⚠️ **Non vérifié à l'écran** : les trois étapes n'ont pas pu être ouvertes dans un
  navigateur (preview d'un worktree → app du dépôt PRINCIPAL, cf. §11). `tsc` vert,
  1 178 tests verts, gabarit rendu et regardé.
- ~~**A29 · Confirmation e-mail**~~ ✅ **TERMINÉ, ACTIF ET ÉPROUVÉ EN PROD LE 2026-08-09** — e-mail reçu EN BOÎTE, zéro Insight Resend.
  Les 12 étapes de `supabase/PROCEDURE-2026-08-07-confirmation-email.md` ont été
  déroulées avec le fondateur. **Mesure d'arrivée** (`npm run check:auth`) :
  `✓ confirmation e-mail  EXIGÉE` — exactement l'inverse du `✖ désactivée` qui a ouvert
  le chantier. Expéditeur **Resend**, SMTP branché, les deux gabarits collés.
  **Prouvé de bout en bout** : e-mail **Delivered** chez iCloud, expéditeur
  `"Kyroz" <contact@kyroz.app>`, code à 6 chiffres saisi → compte confirmé,
  `Confirmed at` renseigné, **et `consent_health_data = true`** — le correctif RGPD
  vérifié en prod, pas seulement en test. Le parcours « mot de passe oublié » (A30)
  fonctionne aussi.

  🔴 **DEUX PIÈGES TROUVÉS EN DÉROULANT LA PROCÉDURE, et aucun n'était visible du code :**
  1. **`Email OTP length` valait 8** sur le projet. L'app tronque à 6 et n'arme son
     bouton qu'à 6 : le parcours aurait été **mort à la livraison**, en affichant
     « code refusé » à quelqu'un ayant saisi exactement ce qu'il a reçu. 6 est pourtant
     le défaut Supabase — la valeur avait été changée sans qu'aucune trace ne le dise.
  2. **Le service e-mail intégré ne délivre QU'AUX membres du projet** (doc Supabase).
     Ce n'est donc pas un bridage à 2/heure, c'est une restriction de destinataires —
     **et c'est l'explication de la panne d'origine** : la personne qui n'a jamais rien
     reçu n'était pas membre. Le SMTP dédié était un prérequis, pas une amélioration.
  ➡️ **Un réglage de dashboard n'a ni historique, ni revue, ni test.** Le seul moment où
  on peut le voir, c'est quand quelqu'un le regarde — donc il faut l'inscrire dans une
  procédure, sinon personne ne le regarde jamais.

  ✅ **LE PASSAGE EN INDÉSIRABLE EST RÉSOLU (2026-08-09).** Le second e-mail était parti
  en spam ; après correctifs, un envoi neuf arrive **en boîte de réception**, et Resend
  n'affiche **plus aucun Insight**.
  **La cause n'était PAS la réputation du domaine** — c'est ce que je supposais, et les
  Insights de Resend ont dit autre chose : *« Ensure link URLs match sending domain »*.
  L'e-mail partait de `kyroz.app` et son bouton pointait vers `…supabase.co` ; pour un
  filtre, un expéditeur qui diverge de sa destination est la signature du phishing.
  Second reproche : *« Include valid DMARC record »*, absent.
  ➡️ Deux correctifs, tous deux gratuits : **DMARC posé** (`_dmarc` TXT
  `v=DMARC1; p=none;`) et **lien retiré de l'e-mail de confirmation** — le code était
  déjà le chemin principal, et l'e-mail de réinitialisation n'a jamais eu de lien pour
  ces mêmes raisons. Vérifié depuis un résolveur public : SPF, DKIM et DMARC en place,
  **et les MX iCloud de la racine INTACTS** (le seul vrai danger de la manœuvre).
  *Alternative écartée : domaine d'auth personnalisé (`auth.kyroz.app`), plan Pro à
  25 $/mois pour un bouton dont personne n'a besoin.*
  *Écarté aussi, malgré la suggestion de Resend : « Use a subdomain » — l'expéditeur
  cesserait d'être une vraie boîte, ce que Resend salue par ailleurs (« Don't use no-reply »).*
  ⚠️ **Un envoi accepté n'est pas une garantie durable** : la réputation d'un domaine se
  construit sur des semaines. Ce qui est acquis, ce sont les deux signaux techniques que
  les filtres reprochaient explicitement — pas une immunité.
  ⚠️ **Le retrait du lien a RÉINTRODUIT un défaut ailleurs** : `traduitErreurConfirmation`
  conseillait encore « si tu as déjà cliqué le lien de l'e-mail… », un geste devenu
  impossible — exactement ce que son homologue de réinitialisation existe pour ne pas
  faire. ➡️ **Retirer un élément d'une interface, c'est aussi relire tout ce qui le CITE.**
  `public/confirme.html`, `URL_RETOUR_CONFIRMATION` et `emailRedirectTo` sont gardés comme
  FILET (e-mails déjà partis qui portent encore un lien ; gabarit du dashboard hors dépôt).

  ⏳ **DEUX SUITES, EN LISTE D'ATTENTE (décision fondateur du 2026-08-09 : « on le fera
  plus tard »). Ne pas les lancer, ne pas les remonter comme un retard :**
  - **Changer son mot de passe DEPUIS l'app** (connecté). Aujourd'hui le seul chemin est
    « Mot de passe oublié ? », donc se déconnecter et passer par un code — absurde quand
    on connaît son mot de passe. ⚠️ Regarder d'abord le réglage **« Secure password
    change »** : activé, il impose une session de moins de 24 h et ferait échouer
    `updateUser` en silence pour un connecté de longue date. Il était DÉSACTIVÉ au 2026-08-09.
  - **Connexion Apple et Google.** L'écran promet « bientôt » depuis des mois ; mesuré,
    les deux providers sont à `false`. ⚠️ Apple l'EXIGE dès qu'un autre login social
    existe (règle 4.8). ⚠️ Et le consentement santé n'a **aucun formulaire où se poser**
    dans un parcours OAuth : ne pas laisser `consent_health_data` à `false` en silence,
    c'est exactement le défaut corrigé ci-dessus.

  <details><summary>Historique du chantier (état pendant la livraison)</summary>
  ⚠️ *Numérotée **A28** à l'écriture, renommée **A29** à la fusion : `A28` était déjà pris
  sur `main` par l'échéance datée. **Deuxième collision de la journée** (cf. E19/E20) —
  le numéro se prend au moment de FUSIONNER, pas au moment d'écrire, parce qu'un
  identifiant choisi sur une branche est une réservation que personne d'autre ne voit.*
  **Mesuré, pas supposé** (`npm run check:auth`, nouveau) : `mailer_autoconfirm: true` —
  **la confirmation e-mail est DÉSACTIVÉE**. Aucun e-mail ne part, tout compte créé est
  actif immédiatement, et le message « Vérifie ta boîte mail » de `login.tsx` ne
  s'affiche jamais. Ce n'était donc ni du spam ni de la délivrabilité.
  ⚠️ **Piège de lecture** : `mailer_autoconfirm: true` = confirmation NON demandée,
  l'inverse de la case du dashboard. Lu vite, il fait conclure le contraire.

  **Livré dans cette PR** — confirmation par **code à 6 chiffres saisi dans l'app**
  (`verifyOtp`), le lien restant en second chemin :
  - `supabase/emails/confirmation.html` — gabarit Kyroz (fond noir, code en gros, zéro
    émoji). ⚠️ **À COLLER dans le dashboard** : ce fichier n'est lu par personne d'autre.
  - `public/confirme.html` — page d'atterrissage du lien, servie comme `legal.html`.
  - `lib/emailConfirmation.ts` + l'écran de saisie dans `login.tsx` (renvoi avec compte
    à rebours, retour connexion).
  - `npm run check:auth` — l'état RÉEL de l'auth en prod, témoin négatif compris.

  🔴 **Un défaut RGPD a été trouvé et corrigé au passage, et il ne se serait vu nulle
  part** : le consentement santé était écrit juste après `signUp`, donc **sans session**
  — ce que la RLS `auth.uid() = id` refuse, et que le `try/catch` avale. Activer la
  confirmation aurait laissé `consent_health_data = false` sur tous les nouveaux comptes,
  alors que la case était bien cochée à l'écran. L'écriture est désormais **reportée**
  jusqu'à l'ouverture de session (les deux chemins : code saisi ET lien cliqué).

  ⚠️ **Pourquoi le code plutôt que le seul lien** : aucun lien universel n'est configuré,
  donc sur mobile le lien ouvre le NAVIGATEUR, pas l'app ; et les antivirus de messagerie
  pré-cliquent les liens, ce qui **consomme** le jeton à usage unique — c'est la panne
  « lien invalide ou expiré » classique, et elle ne se reproduit jamais chez soi.

  **⏳ CE QUI RESTE, et c'est hors du dépôt** : `supabase/PROCEDURE-2026-08-07-confirmation-email.md`
  (12 étapes, une à la fois). L'ordre n'est pas négociable — déployer l'app, **puis** un
  SMTP dédié (le service intégré est bridé à ~2 envois/heure et déconseillé en prod par
  Supabase : c'est le suspect n°1 du « ça ne marchait plus pour une personne »), **puis**
  l'interrupteur. Décisions du fondateur : code à 6 chiffres + **Resend** en expéditeur.
  ⚠️ **Non vérifié à l'écran** : l'écran de saisie n'a pas pu être ouvert dans un
  navigateur (le preview d'un worktree sert l'app du dépôt PRINCIPAL, cf. §11). Garanties :
  `tsc` vert, 1 165 tests verts dont les 4 tests de DA. Le gabarit et la page, eux, ont
  été rendus et regardés.
  *(Cette réserve est levée : le parcours a été éprouvé en PROD le 2026-08-09 par le
  fondateur — inscription réelle, code saisi, compte confirmé.)*

  </details>

- ~~**A31 · Jouer la migration `meal_slots` en prod**~~ ✅ **JOUÉE le 2026-08-07, PR #46
  mergée, site déployé** — les créneaux de repas libres sont EN LIGNE.
  Séquence respectée, et c'est elle qui compte : SQL d'abord, merge ensuite (le merge
  déclenche l'auto-deploy, donc déployer avant la migration casse le push profil).
  Mesuré avant/après avec `npm run check:migrations` : les **39 colonnes** de
  `PROFILE_COLS` en une requête passent de `400` à **`200`**, témoin négatif à `400`
  dans les deux cas. Re-mesuré le 2026-08-08 : toujours `200`.
  Vérifié aussi sur l'ARTEFACT en ligne (bundle téléchargé depuis GitHub Pages, témoins
  **ASCII purs** — `meal_slots` ×8, `BUILTIN_SLOTS` ×6, `MAX_MEAL_SLOTS` ×2,
  `nextCustomSlotId` ×2 ; témoins négatifs et `sk-ant-` à **0**, `BASE_WEIGHT` à **0**,
  il a bien quitté le moteur).
  ⚠️ **Le filet `PROFILE_COLS_LAST_MIGRATION` a été vu à l'œuvre pour la première fois**
  (avant la migration) : la synchro est retombée sur « tout sauf `meal_slots` » **en le
  journalisant**, au lieu de tuer le push profil en silence. Il fonctionne — il ne
  dispense toujours pas de jouer le SQL.
  ✅ **Le natif l'a aussi** — la **6ᵉ OTA** (`0d045fe`, 2026-08-08, commit `9bac59a`) le
  contient (« repas paramétrables » y figure) : `f93c734` est un ancêtre de `9bac59a`,
  vérifié. **Aucun écart web/natif sur ce chantier.**
  ⚠️ Cette ligne a d'abord annoncé le contraire — j'avais ouvert une entrée « publier
  l'OTA » sans vérifier ce qu'une autre session venait de publier. Le contrôle est un
  `git merge-base --is-ancestor`, il coûte deux secondes : **avant d'annoncer un écart
  web/natif, comparer les COMMITS, pas les dates.**

- ~~**A1 · Confirmer une écriture RÉELLE en prod**~~ ✅ **PROUVÉ le 2026-07-31, par
  mesure contre la prod** (REST + clé anonyme, aucun accès dashboard nécessaire) :
  les **37 colonnes** de `PROFILE_COLS` demandées en une requête → `200` · écriture
  d'un profil complet → `200` · relecture → valeurs intactes, **JSONB compris**
  (`calorie_bank`, `goal_target`, `low_ea_weeks`, `fixed_meals`) · modification
  (80 → 79 kg, banque 600 → 450) → relue à 79 / 450 · RLS authentifiée → **1 seule
  ligne visible**, la sienne. La synchro écrit, relit et cloisonne.
  Toutes les migrations sont donc jouées, `2026-07-30_profiles_calorie_bank.sql`
  comprise. **Preuve + mode d'emploi reproductible : `supabase/JOURNAL-MIGRATIONS.md`.**
  ⚠️ **À purger** : la vérification a ouvert une session invité (`205132cb…`). Sa ligne
  `profiles` est supprimée ; la ligne `auth.users` demande le dashboard.
- ~~**A2 · Vérifier `RECORD_AUDIO`**~~ ✅ **RÉSOLU le 2026-07-30 — et le soupçon était FONDÉ.**
  `npx expo prebuild -p android` puis lecture du manifeste : `RECORD_AUDIO` **y était bien**,
  alors qu'elle n'apparaît nulle part dans `app.json`. Confirmation que `android.permissions: []`
  ne prouve rien — la liste est additive, les plugins ajoutent les leurs à la fusion.
  **Une seconde permission a été trouvée au passage** : `SYSTEM_ALERT_WINDOW`
  (« afficher par-dessus les autres apps »), présente dans le manifeste de RELEASE alors
  qu'elle n'a de sens que dans celui de **debug**, où elle figure déjà (menu dev de React
  Native). Google Play lui applique une politique dédiée.
  **Correction, à deux niveaux** : `microphonePermission: false` sur le plugin
  `expo-image-picker` (coupe le micro à la source), + `android.blockedPermissions` comme
  filet contre ce que la fusion réintroduirait. Vérifié : les deux portent désormais
  `tools:node="remove"` dans le manifeste généré.
  ⚠️ **Le manifeste final ne garde que le nécessaire** : `INTERNET`, `VIBRATE` (rappel
  quotidien), `READ`/`WRITE_EXTERNAL_STORAGE` plafonnées à maxSdk 32 (photos de
  progression). Ne pas retirer ces deux dernières : elles cassent le choix de photo sur
  Android ≤ 12.

- ~~**A3 · L'objectif daté annonce une date que le moteur ne tiendra pas**~~ ✅ **CORRIGÉ
  le 2026-07-31** — *« pas de mensonge dans Kyroz » (fondateur).* La projection
  divisait l'écart par le rythme du PREMIER JOUR, en ignorant deux mécanismes
  garantis : la baisse du TDEE avec le poids, et l'escalade de zone basse (13ᵉ
  semaine, femme non ménopausée). Mesuré en suivi parfait — annoncé vs réel :
  H 80→74 J+206/J+203 · H 95→85 J+397/J+392 · **F 65→58 J+189/J+371 (+182 j)** ·
  **F 80→70 J+263/J+1295 (+1032 j, 2027 annoncé pour 2030 réel)**.
  Elle SIMULE désormais semaine par semaine, en rejouant le moteur
  (`datedGoal.weeksToTargetSimulated` + `tdee.makeWeeklyProjector`, injecté pour
  éviter le cycle d'imports). Après : **−1 à −7 jours** contre une simulation de
  référence écrite séparément, sur des horizons de 71 à 1239 jours.
  ⚠️ Le vrai piège corrigé au passage : `reachableByDate` se contentait de
  « rien n'est bridé AUJOURD'HUI ⇒ la date tient ». L'escalade ne mordant qu'à la
  13ᵉ semaine, c'était précisément le mensonge. **DISPLAY-ONLY** : aucune calorie
  servie ne bouge, donc pas de bump d'`ENGINE_REV`. 9 tests.
  ✅ **VÉRIFIÉ À L'ÉCRAN le 2026-07-31** (session locale du fondateur, profil F 80 kg
  → 70 kg au 15/01/2027, plan servi AU PLANCHER, déficit 182 kcal/j) : l'ancien calcul
  annonçait *« Plutôt le 27 septembre 2027 »* ; l'écran affiche désormais *« Rythme sûr
  atteint · cette date n'est pas tenable »*. Et c'est exact — simulée, sa trajectoire
  **s'arrête à 77,4 kg vers la semaine 20** (l'escalade annule le déficit) : elle
  n'atteint jamais 70 kg. L'ancienne version donnait une date pour un poids que le
  moteur n'aurait jamais servi.
- ~~**A4 · La sortie de zone basse ne se relâche jamais**~~ ✅ **TRAITÉ le 2026-07-31 —
  et mon diagnostic était À MOITIÉ FAUX.** Ce qui était réel : le décompte dépendait
  d'un ARRONDI. Le plancher escaladé vaut `seuil × masse maigre + sport`, donc au
  plafond l'énergie disponible servie vaut exactement 35 ; un test `< 35` dessus ne
  décidait plus rien de physiologique, il décidait de l'arrondi au kcal du plancher
  (mesuré : EA oscillant entre 34,99 et 35,01, compteur saturé à ~46 semaines).
  Corrigé par une marge d'un demi-cran d'escalade (`EA_COUNT_TOLERANCE`) : le
  compteur se stabilise à 21–23, le déficit résiduel passe de 34 à 34–59 kcal/j.
  **Ce qui était FAUX dans mon constat : le « verrou à vie ».** Après un long séjour
  en zone basse, la personne est tenue à l'énergie disponible OPTIMALE, durablement
  et par construction — mais elle continue de perdre (80 → 71 kg sur 130 semaines),
  elle n'est pas arrêtée. C'est la protection qui s'applique, pas un accident.
  ⚠️ **Piège mesuré, à ne pas retenter** : forcer le registre à se vider en exigeant
  un déficit minimal pour qu'une semaine compte (essayé à 5 % de la maintenance)
  fonctionne — et **casse quatre tests de `sortie-deficit-ea.test.ts`**. Le point
  fixe disparaît, la cible se met à osciller, et l'écran d'escalade ne peut plus
  promettre de fin à la remontée. Or cette promesse est AFFICHÉE à l'utilisatrice.
  La stabilité du plateau est load-bearing : ne pas la sacrifier pour vider un
  compteur. La doc de `lowEaWeeksBefore`, qui laissait croire l'inverse, est
  corrigée sur place. 5 tests.

- ~~**A5 · Le %MG saisi peut effacer un déficit en silence**~~ ✅ **REPÈRE POSÉ le
  2026-07-31.** Trouvé par le fondateur : « femme 80 kg 20 %MG » et « homme 80 kg
  20 %MG » donnent **exactement le même plan**, recette par recette. Ce n'est pas un
  bug — dès que le %MG est déclaré, Katch-McArdle ne lit QUE la masse maigre, et le
  sexe n'entre pas dans la formule (64 kg de masse maigre des deux côtés → BMR 1752,
  TDEE 2294, cible 2112). Sans %MG déclaré, Mifflin reprend la main et l'écart est
  franc : 1731 (F) contre 1990 (H).
  ⚠️ **Ce que ça révèle, et qui EST un risque** : le %MG est le second réglage le plus
  lourd après le NEAT, et presque personne ne le connaît. Pour cette même femme,
  saisir 20 % au lieu des 36 % estimés vaut **+381 kcal/jour sur la cible** — le
  déficit disparaît en entier, en silence, découvert des semaines plus tard sur la
  balance. Et l'erreur n'est pas symétrique : sous-estimer son %MG gonfle la dépense
  (échec muet) ; la sur-estimer creuse le déficit, ce qui se voit et reste tenu par le
  plancher.
  **Correctif = un repère, pas un blocage** (ces valeurs existent) : sous la silhouette
  la plus maigre de la charte (18 % F / 10 % H), la saisie manuelle affiche ce que le
  chiffre coûte, calculé sur SON corps. Vérifié à l'écran : *« 15 %, c'est un niveau
  d'athlète de compétition · Ce chiffre relève ta dépense estimée de 375 kcal/jour… »*
  Les seuils sont ceux de la charte — un tap d'illustration ne peut jamais le lever —
  et un test le verrouille contre une évolution de `BodyFatPicker`. 4 tests.
  ℹ️ Le sexe n'a pas disparu pour autant : il agit **dans le temps**. Même profil suivi
  30 semaines, déficit servi : femme `S1:182 S16:98 S20:0` (77,4 kg) · homme
  `S1:182 S16:191 S20:193` (74,8 kg). Seule elle subit l'escalade RED-S.

- ~~**A6 · le sexe n'a AUCUN effet sur le TDEE ni les macros quand le %MG est
  déclaré**~~ ✅ **TRANCHÉ ET LIVRÉ le 2026-07-31.** Soulevé par le fondateur, qui a
  refusé la réponse « c'est le comportement attendu ». **Il avait raison de la
  refuser — mais la cause n'était pas celle qu'on croyait.**

  **Le fait, mesuré** (80 kg · 170 cm · 35 ans · 4× muscu · sèche · %MG 20 déclaré) :

  | | masse maigre | BMR | TDEE | cible | macros |
  |---|---|---|---|---|---|
  | femme | 64,0 kg | 1752 | 2294 | 2112 | P150/G245/L59 |
  | homme | 64,0 kg | 1752 | 2294 | 2112 | P150/G245/L59 |

  **La vraie cause, mesurée : la cible n'est pas pilotée par le TDEE, c'est le
  PLANCHER.** `2112 = EA_HARD_FLOOR (30) × 64 kg de masse maigre + sport`, et
  `safety.ts` dit explicitement *« kcal/kg de masse maigre — plancher dur, les deux
  sexes »*. La formule de BMR n'y est pour rien : à masse maigre égale, le plancher
  est égal, donc la cible aussi. `calculateBMR` bascule bien en Katch-McArdle (sans
  terme de sexe) dès qu'un %MG est saisi, mais ce n'est que le second verrou.

  **Les trois options ont été mesurées en patchant le moteur** (`lib/tdee.ts`
  temporairement modifié, puis restauré — jamais sur une réplique) :

  | option | BMR F/H | TDEE F/H | **cible F/H** |
  |---|---|---|---|
  | A — Katch-McArdle (actuel) | 1752 / 1752 | 2102 / 2102 | **1920 / 1920** |
  | C — moyenne Katch + Mifflin | 1639 / 1722 | 1967 / 2066 | **1920 / 1920** |
  | B — Mifflin toujours | 1527 / 1693 | 1832 / 2032 | **1832 / 1920** |

  *(sans sport dans ce jeu de mesure ; avec les 4 séances, 1920 devient 2112)*

  - **C ne résout rien** : le TDEE bouge de 99 kcal, la cible ne bouge pas d'un kcal
    — le plancher la reprend. Un `ENGINE_REV` pour rien.
  - **B est strictement pire** : sous Mifflin, le BMR de la femme vaut **1527 à 20 %
    de MG comme à 30 %**. On échangerait « le sexe ne change rien » contre « le %MG
    ne change plus rien », sur la variable la plus lourde du moteur.
  - → **A conservé. Aucune formule touchée, aucun `ENGINE_REV`, aucune cible déplacée.**

  **Ce qui a été corrigé à la place** (c'est là qu'était le vrai défaut) :

  1. **Repère de MASSE MAIGRE** (`safety.FFMI_ATYPICAL_ABOVE`, 21 F / 25 H) —
     `ATYPICAL_BF_BELOW` est un seuil PLAT qui ne regarde que le pourcentage : muet
     sur 20 % chez une femme (20 > 18) alors que ce chiffre annonce **64 kg de masse
     maigre, FFMI 22,1**, au-dessus du plafond naturel féminin. Le nouveau repère est
     sexué par construction et attrape exactement le cas du fondateur. Les deux
     coexistent (`safety.bodyFatConcern`, source unique) : ils attrapent deux
     improbabilités différentes. ⚠️ À la différence de l'ancien, celui-ci PEUT se
     lever sur un tap de silhouette — c'est voulu, un chiffre improbable l'est autant
     tapé que choisi.
  2. **La cible dit maintenant quand elle EST le plancher** (`profil.tsx`,
     `FLOOR_APPLIED`) — le drapeau existait mais n'était affiché que dans l'éditeur
     « Perso % » et l'objectif daté. Sur l'écran principal, une cible bloquée au
     plancher ne réagissait plus aux réglages **sans un mot**, ce qui se lit comme un
     moteur en panne. C'est ce silence qui a produit la question.

  ℹ️ Le sexe agit toujours, mais **dans le temps** (escalade RED-S, `MIN_KCAL`,
  bornes de %MG). Mesuré sur 30 semaines de sèche : femme `S1:182 S16:98 S20:0` →
  77,4 kg ; homme `S1:182 S16:191 S20:193` → 74,8 kg.

  Vérifié à l'écran (femme → repère « 64 kg de masse maigre / +270 kcal/jour » ;
  homme même corps → aucun repère ; note de plancher rendue sur les deux).
  752 tests verts, `tsc` propre.

- ~~**A7 · le déficit demandé n'est JAMAIS servi au NEAT `desk`**~~ ✅ **TRANCHÉ ET
  LIVRÉ le 2026-07-31 : `desk` passe à 1,30, `ENGINE_REV` 2 → 3.** Table resserrée à
  1,30 / 1,35 / 1,40 / 1,45 pour rester monotone sous le plafond de 1,45. Mesuré sur
  27 648 profils : cible servie médiane **+77 kcal/j** (max +239, aucune baisse),
  plancher contraignant **16 % → 9 %**, déficit plein servi en sèche **59 % → 81 %**.
  ⚠️ **Risque assumé** : en MAINTIEN la hausse est répercutée en entier (médiane
  +84 kcal/j) — si l'estimation est trop haute, ces personnes mangent au-dessus de
  leur dépense, et c'est silencieux.
  **Trois bloquants trouvés par revue adverse et corrigés avant merge** : (1) la carte
  de sortie de déficit annonçait « environ 0 kcal par semaine, encore 9 semaines »
  sur 12 % des cartes ; (2) l'avertissement one-shot servait le texte rev-3 aux
  comptes legacy, qui eux voient leur cible BAISSER ; (3) un avertissement non lu
  avalait la bascule suivante, affichant les chiffres de l'ancienne transition.
  L'ancienne analyse est conservée ci-dessous, elle explique POURQUOI le 1,20 tenait.

  *Analyse d'origine :*

- **~~DÉCISION EN ATTENTE~~ — le déficit demandé n'est JAMAIS servi au NEAT
  `desk`.** *Soulevé par le fondateur le 2026-07-31. Sa prémisse a été vérifiée et
  elle est même plus large qu'il ne la posait. Rien n'a été changé : sa consigne
  était conditionnelle (« si le 1,20 vient d'une table, passe-le à 1,30 ») et la
  condition est FAUSSE — le 1,20 vient d'une calibration empirique
  (`docs/archive/2026-07-28-audit-p1-mesures.md`), qui avait mesuré puis REJETÉ
  le 1,30.*

  **Mesuré** (0 séance, sèche, −300 demandés) : le déficit demandé n'est servi à
  AUCUNE masse maigre, de 30 à 80 kg.

  | profil | TDEE | demandé | plancher EA | servi | déficit réel |
  |---|---|---|---|---|---|
  | H 60 kg · 15 %MG | 1766 | 1466 | 1530 | 1530 | −236 |
  | H 80 kg · 25 %MG | 1999 | 1699 | 1800 | 1800 | −199 |
  | H 100 kg · 35 %MG | 2129 | 1829 | 1950 | 1950 | −179 |
  | F 60 kg · 25 %MG | 1610 | 1310 | 1350 | 1350 | −260 |
  | F 80 kg · 35 %MG | 1792 | 1492 | 1560 | 1560 | −232 |

  Le point de bascule est exactement `FFM ≤ 35,3 kg` (`144 ≥ 4,08 × FFM`) : au-delà
  c'est le plancher EA qui mord, en deçà `MIN_KCAL`. Au cran `light` (1,28), les
  5 profils reçoivent les −300 entiers.

  **Pourquoi ce n'est pas une contradiction avec la calibration** : elle mesurait
  « combien de déficit reste-t-il face au moteur legacy », pas « la demande est-elle
  servie ». Deux questions différentes — la seconde n'avait jamais été posée.

  **Trouvaille liée, non tranchée : l'effet thermique des aliments n'est nulle part.**
  Zéro occurrence dans le code et dans la spec. Les valeurs 1,20–1,45 sont empruntées
  aux PAL classiques, qui sont des multiplicateurs CORPS ENTIER incluant le TEF. Or
  `tdee.ts` documente la table comme « la vie quotidienne HORS sport », sport compté
  à part par les MET. Lu ainsi, il manque ~10 % de l'apport (≈200 kcal/j à 2000 kcal),
  ce qui SOUS-estime le TDEE et aggrave le problème ci-dessus. C'est un meilleur
  argument pour relever le multiplicateur qu'un 1,30 arbitraire.

  ⚠️ Toute option retenue déplace la cible de TOUS les comptes sédentaires →
  incrémenter `ENGINE_REV` et prévoir l'avertissement one-shot.

- ~~**A8 · `UserProfile.clamp` n'a jamais trouvé de lecteur**~~
  ✅ **TRANCHÉ ET RETIRÉ le 2026-08-04** (fondateur : « retire le champ »).
  Le champ a vécu du 2026-07-31 au 2026-08-04 **sans qu'une seule ligne ne le lise** :
  l'écran qui affiche cette information (`profil.tsx`) lit `plan.clamp`, produit par
  `computePlan`. Retiré de `types.ts`, `tdee.ts`, et le type `ClampInfo` avec lui —
  il devenait mort. `FloorSource`, lui, RESTE dans `types.ts` : il y était descendu
  pour ce champ, mais il a depuis deux autres porteurs (`ClampRecord`, `safety.ts`).

  **Le motif n'est pas l'encombrement, c'est la DIVERGENCE.** `ClampInfo` (stocké) était
  un SOUS-ensemble de `ClampRecord` (calculé) : mêmes cinq valeurs, moins `floorBinding`
  et les candidats de diagnostic. On gardait donc une copie *appauvrie* et *figée au
  dernier `recalcProfile`* à côté d'une valeur recalculée — une seconde source de vérité
  qui attend son bug. Ce n'est pas théorique : la même semaine, deux compteurs de tests
  d'`AGENTS.md` se sont contredits, et le couloir de progression se dessinait sur la
  saisie au lieu du servi (A15-bis). L'argument « c'est plus rapide que recalculer » ne
  tenait pas non plus : `computePlan` coûte **0,11 ms**.

  ⚠️ **Le NETTOYAGE doit survivre au champ, et c'est le vrai piège de ce retrait.** Les
  comptes créés entre les deux dates en portent une copie dans AsyncStorage. Cesser de
  l'écrire ne l'efface pas : sans la ligne qui la retire, elle y resterait pour toujours,
  figée, prête à être relue un jour comme si elle était fraîche. Et la mettre à
  `undefined` ne suffirait pas — `JSON.stringify` l'élide, donc la comparaison
  anti-réécriture de `useProfile` ne verrait rien à persister.
  ➡️ Garde-fou `safety.test.ts` → « MIGRATION : une trace déjà STOCKÉE est nettoyée ».
  **Vérifié par mutation** : retirer le nettoyage fait rougir ce test, et lui seul.

  ℹ️ L'invariant « la trace est présente exactement quand `FLOOR_APPLIED` » n'a PAS été
  supprimé avec le champ : ce qu'il protège — un seul prédicat pour une seule question,
  pour que l'écran ne puisse pas contredire le drapeau — reste vrai. Il a changé de
  porteur, il s'exerce sur `plan.clamp`.
  ➡️ Si un écran a un jour besoin de cette trace SANS calculer de plan : appeler
  `computePlan` et lire `plan.clamp`. Ne pas remettre le champ.
  *(Coût one-shot du retrait, symétrique à celui de l'ajout : ~18 % des comptes voient
  leur profil réécrit une fois à la première ouverture. La ligne poussée est identique,
  `clamp` n'ayant jamais été dans `PROFILE_COLS`.)*
  Livré le 2026-07-31 à la demande du fondateur (champ additif, `recalcProfile`
  garde sa signature). L'écran Profil appelle déjà `computePlan`, donc il lit
  `plan.clamp` et non `profile.clamp` : le champ stocké attend son premier
  consommateur — un écran qui ne calcule pas de plan.
  **Coût mesuré** : à la première ouverture après déploiement, ~18 % des comptes
  voient leur profil réécrit en local, marqué `dirty` et poussé une fois. La ligne
  poussée est IDENTIQUE (`clamp` absent de `PROFILE_COLS`), donc c'est un push à
  vide, one-shot et idempotent ensuite. Soit un écran l'utilise, soit on retire le
  champ — c'est une ligne.

- ~~**A9 · Le plancher lipidique est tenu sur la CIBLE, pas sur ce qui est SERVI**~~
  ✅ **CORRIGÉ le 2026-08-01, sur « go » du fondateur.** `CLAUDE.md` §6 rangeait le
  seuil de carence (0,8 g/kg de poids de corps) parmi les **hard blocks**, mais il
  n'était appliqué qu'à la cible. En sèche comme en maintien la cible valait
  EXACTEMENT le plancher — marge nulle — donc le plan, qui approxime la cible avec de
  vraies recettes, retombait dessous.

  **Correctif** : `FAT_FLOOR_AIM_MARGIN = 1.15` dans `lib/tdee.ts`. La cible VISE 15 %
  au-dessus du plancher pour que **l'assiette** le franchisse. Le seuil de carence,
  lui, ne bouge pas. `ENGINE_REV` 3 → 4, `ENGINE_VERSION` 27 → 28. 787 tests verts.

  **Mesuré, 560 jours servis (10 profils × 8 tirages × 7 jours)** :

  | marge | jours sous 0,8 g/kg | pire écart |
  |---|---|---|
  | ×1,00 *(avant)* | **86 %** | −29 g (H 100 · 2 repas, 0,50 g/kg servi) |
  | ×1,05 | 71 % | −29 g |
  | ×1,10 | 22 % | −30 g |
  | **×1,15** *(retenu)* | **1 %** | **−8 g** |

  Au-delà de 1,15 le gain s'arrête et le coût continue.

  ⚠️ **PISTE ÉCARTÉE, MESURÉE — ne pas la retenter.** J'ai d'abord parié sur le
  plafond de rôle `fat` du catalogue (×1,5, le plus bas de tous les rôles : protéine
  1,7, glucides 1,8). **Le relever ne corrige RIEN** : 86 % → 83 % à ×1,7 comme à
  ×2,0, et le pire cas ne bouge pas. Le manque ne vient donc pas de recettes
  incapables de porter plus de gras — le moteur vise les kcal et la protéine, et les
  lipides encaissent le résidu. C'est la cible qu'il fallait bouger, pas les recettes.

  ⚠️ **CE QUE ÇA COÛTE, et c'est la contrepartie à connaître** (576 profils) :
  `CARBS_BELOW_TRAINING_FLOOR` **30 % → 39 %** · part lipidique 27,8 % → 30,7 %
  (toujours dans la fourchette usuelle 20–35 %) · glucides moyens 306 → 289 g.
  On échange le franchissement SYSTÉMATIQUE d'un garde-fou de sécurité contre un
  avertissement de performance plus fréquent.

  ✅ **LE POINT « CURSEUR » QUI EN DÉCOULAIT EST RÉGLÉ le 2026-08-01** (« go curseur ») :
  l'écran affiche désormais la part RÉELLEMENT SERVIE. Détail juste en dessous.

  ℹ️ **Aucun avertissement one-shot n'est servi** : les calories ne bougent pas (seule
  la répartition change), l'écart est donc sous le seuil des 100 kcal et la carte
  `EngineNoticeCard`, bâtie sur un delta de kcal, ne se déclenche pas. C'est voulu —
  elle aurait affiché « ton budget est passé de 2073 à 2073 kcal (+0) ».

- ~~**A10 · « Perso % » annonçait un partage qu'il ne servait pas**~~ ✅ **CORRIGÉ le
  2026-08-01.** Révélé par un test tombé pendant A9.
  **Le défaut était petit et net** : sous le curseur, la ligne « → 45 % lipides » était
  un simple `100 − curseur`, une soustraction qui **ne consultait pas le moteur**.
  Or le plancher lipidique passe AVANT le réglage : un curseur à 55 % de glucides en
  sert 50. Et les GRAMMES affichés juste en dessous, eux, venaient bien de
  `macrosPercent` — **l'écran se contredisait donc lui-même**, à trois lignes d'écart.
  **Correctif** : `servedCarbSharePct()` dans `lib/tdee.ts` (pur, testé) lit ce qui sera
  réellement servi ; `MacroSplit` l'affiche, et ajoute une note quand l'écart dépasse
  `SPLIT_DIVERGENCE_TOLERANCE_PCT` (2 points — en deçà c'est de l'arrondi au gramme).
  Ton de la note : on explique, on ne reproche pas — *« Kyroz garde un minimum de
  lipides pour tes hormones et tes vitamines, et répartit le reste selon ton réglage. »*
  **Deux autres sorties écartées** : borner le maximum du curseur le rendrait dépendant
  du profil (il bougerait avec le poids, sans dire pourquoi) ; laisser le plancher céder
  en « Perso % » contredirait `CLAUDE.md` §6, qui exige qu'aucun chemin de code ne le
  contourne. 4 tests. 791 au total.
  ⚠️ **NON VÉRIFIÉ À L'ÉCRAN, et voici pourquoi** : l'éditeur « Calories & macros » est
  derrière l'authentification, et le provider invité est coupé (cf. E3). Créer un compte
  n'est pas quelque chose qu'un assistant fait. **Le fondateur peut le voir en un clic**
  (Profil → Calories & macros → Perso %) sur un profil en sèche.

- ~~**A11 · L'app se fige au démarrage quand le réseau ne répond pas**~~ ✅ **CORRIGÉ
  le 2026-08-02** — remonté par le fondateur : *« bug parfois aucun plan ne se génère
  quand je reviens sur le lien »*, *« bug web sur tel qui se fige, obligé de forcer la
  fermeture »*.
  **La cause, mesurée** : le premier rendu attendait DEUX appels réseau **sans aucune
  borne de temps** — `supabase.auth.getSession()` (qui part en rafraîchissement de jeton,
  avec ses propres retries, et `fetch` n'a pas de délai d'expiration) puis
  `hydrateFromCloud()` (**6 requêtes en série**). Tant que les deux n'avaient pas répondu,
  `ready` restait faux et l'app affichait le splash. **Reproduit avec un `fetch` qui ne
  répond jamais : au bout de 20 s l'écran affichait encore « KYROZ », alors que le profil
  ET le plan étaient déjà en local** (`@kyroz:profile` et `@kyroz:plan` présents). C'est
  une contradiction frontale avec `CLAUDE.md` §4 (« latence < 1 s », « fallback toujours »)
  et avec l'offline-first de §3 : l'appareil avait tout ce qu'il fallait et refusait
  d'afficher.
  ⚠️ **Pourquoi ça tape surtout la version posée sur l'écran d'accueil** : elle est
  réveillée après une mise en veille, avec un jeton à rafraîchir et un réseau pas encore
  revenu — exactement la fenêtre où les deux appels traînent. Et elle ouvre **directement
  un onglet** sans passer par l'index, donc par la garde de `app/(tabs)/_layout.tsx`.
  **Correctif** : `lib/boot.ts::withBudget` borne l'ATTENTE (il n'annule rien — la requête
  continue en fond et son résultat est pris en compte s'il arrive). Auth 1,5 s → repli sur
  la session **persistée sur l'appareil** (`readPersistedSession`), pas sur « pas de
  session » : sinon un réseau muet renverrait vers l'écran de connexion quelqu'un de
  parfaitement connecté. Hydratation 6 s, et elle ne retient l'écran **que si l'appareil
  n'a rien à afficher** (`hydrating` dans les deux gardes) — sinon on renverrait faire
  l'onboarding à quelqu'un qui se connecte sur un 2e appareil.
  ⚠️ **La contrepartie, assumée** : le profil local s'affiche avant la fin de la synchro.
  `hydrationTick` déclenche donc une **relecture** quand le cloud arrive, même très en
  retard — sans quoi une synchro tardive resterait invisible jusqu'au prochain démarrage.
  La relecture ne remplace l'objet en mémoire **que si le contenu a changé** : une
  nouvelle identité d'objet relancerait l'effet de l'écran Plan, qui compte une ouverture
  (série + analytics).
  ℹ️ `storageKey` est désormais posée explicitement dans `lib/supabase.ts` — **valeur
  identique au défaut de supabase-js**, vérifié contre la clé réellement présente
  (`sb-…-auth-token`) : personne n'est déconnecté. 5 tests (`lib/__tests__/boot.test.ts`),
  **818 au total**. Vérifié à l'écran, réseau totalement muet : le plan s'affiche, et
  l'ouverture directe d'un onglet aussi.

- **A12 · ❌ DIAGNOSTIC FAUX, corrigé le 2026-08-02 — à lire AVANT de rejuger la
  fraîcheur du site.** Gardé en entier, parce que l'erreur est plus instructive que la
  conclusion.
  **Ce qui a été affirmé** : *« le site déployé date du 3 juillet, 230 commits de
  retard »*. **C'était faux.** Le signal lu était la date de `origin/gh-pages` — or
  **cette branche est MORTE** : vestige de l'ancien flux `gh-pages -d dist`. GitHub Pages
  sert l'artefact produit par **GitHub Actions** (`gh api repos/…/pages` → `build_type:
  "workflow"`), déclenché à **chaque push sur `main`**.
  **Mesuré après coup** : le workflow a tourné **42 fois le 2026-07-30, 15 le 07-31, 32
  le 08-01**. Le site n'a jamais eu un mois de retard. `gh run list --workflow=deploy.yml`.
  **Pourquoi l'erreur a tenu si longtemps** : (1) une branche `gh-pages` réellement figée
  au 2026-07-03, qui *ressemble* à la vérité ; (2) une remarque du fondateur sur le
  « temps de prépa » lue comme un constat en direct alors que c'était une question de
  mémoire ; (3) une vérification par hash de bundle qui **ne pouvait pas départager** —
  `expo export` est déterministe, donc le build local et celui du workflow produisent le
  MÊME nom de fichier. Le contrôle semblait probant et ne prouvait rien.
  ⚠️ **`npm run deploy` (gh-pages -d dist) ne publie RIEN** : il pousse sur la branche
  morte. Ce n'est pas ce script qui a mis le site à jour pendant cette session — c'est le
  `git push` vers `main`. **Piège à retirer ou à renommer** (cf. E — dette technique).
  ➡️ **Publier = pousser sur `main`.** Vérifier = `gh run list --workflow=deploy.yml`.
  ➡️ Ce qui reste vrai et non expliqué par ce point : le « 23 → 33 » (cf. A13), dont la
  piste restante est le **cache du raccourci d'écran d'accueil**, pas le déploiement.

- ~~**A13 · Le champ « % exact » se réécrit sous les doigts pendant la frappe**~~
  ✅ **DURCI le 2026-08-02.** Remonté par le fondateur (*« 33 au lieu de 23 »*, saisi au
  clavier).
  Le correctif de juin (retirer le clamp MIN pendant la frappe, `1807b5e`) n'avait traité
  que **la moitié** du problème : il visait le déclencheur, pas le mécanisme. Le mécanisme,
  c'est la synchro `useEffect([value]) → setPctText`, qui réécrit le texte tapé **dès que
  n'importe quel clamp modifie `value` au milieu d'une frappe** — MIN, MAX, ou le
  re-bornage au changement de sexe. La touche suivante s'ajoute alors à un nombre que
  l'utilisateur n'a jamais tapé.
  **Mesuré à l'écran, profil homme (plafond 60 %), AVANT / APRÈS** : taper « 9 » puis « 9 »
  affichait **`60` en pleine frappe** → affiche désormais **`99`**, normalisé à `60` au
  blur. Le MIN ayant sauté en juin, seul le MAX restait exposé — mais c'est la même
  mécanique, et c'est celle qui produit « 23 → 33 ».
  **Correctif** : une ref `focused` ; la synchro depuis `value` ne s'applique QUE si le
  champ n'a pas le focus (tap d'une silhouette, « Effacer »). `onBlur` écrit lui-même la
  valeur normalisée. Aucun clamp n'est retiré : on ne stocke toujours pas de valeur
  absurde, on cesse juste de corriger l'utilisateur pendant qu'il écrit.
  ⚠️ **Non prouvé** : que ce soit CE chemin qui ait produit le 33 chez le fondateur — le
  déclencheur MIN n'est plus dans le code depuis le 2026-06-27, donc son téléphone servait
  vraisemblablement un bundle en cache plus ancien. À revérifier sur la version fraîche
  une fois A12 déployé.

- ~~**A14 · « Objectif daté » annonçait une date sous une phrase qui la contredisait**~~
  ✅ **CORRIGÉ le 2026-08-02.** Remonté par le fondateur, captures à l'appui : les CINQ
  échéances (4 / 8 / 12 / 16 / 24 sem) affichaient **exactement les mêmes chiffres** —
  seule la date changeait.
  **Ce n'est PAS un bug de calcul, et c'est important** : ce n'est pas l'échéance qui
  pilote, c'est le **plancher de sécurité**. Mesuré sur le moteur (H 83 kg, 18 %MG, 4
  séances → 70 kg) : plancher 2241 kcal/j, donc déficit borné à ~350 kcal/j, donc
  **0,3 kg/sem quelle que soit la date choisie**. Le moteur a raison de refuser de creuser.
  **Ce qui était faux, c'est la phrase.** `« Cible le 30 août 2026. »` était affirmée
  comme un fait, juste sous les puces — pour une atteinte réelle le **19 juin 2027**,
  soit **293 jours plus tard**. La vérité était déjà à l'écran (carte « plancher »), mais
  **sous** la phrase qui disait l'inverse, et **hors du premier écran** (le bouton
  Enregistrer la recouvre sur iPhone).
  **Correctif** : la ligne sous les puces cesse d'affirmer une date que le moteur ne
  tiendra pas — `« Cible le 30 août 2026 — au rythme sûr, Kyroz t'y amène plutôt vers le
  24 mai 2027. »`. Elle s'appuie sur `reachableByDate` / `projectedDate`, qui existaient
  déjà : rien n'est recalculé à côté. **Aucune calorie ne bouge** — c'est un correctif
  d'affichage, donc pas d'`ENGINE_REV`.
  Vérifié à l'écran sur les 5 échéances. Garde-fou : `datedGoal.test.ts` → « A14 — cible
  hors de portée ». 819 tests.
  ⚠️ **CETTE PUCE N'EXISTE PLUS depuis A27 (2026-08-03)** — ce qui suit est de l'histoire,
  pas l'état du code. La rangée entière a alors été dérivée du corps, donc sa PREMIÈRE
  puce était par construction l'échéance la plus courte qui tienne : garder « N sem ·
  tenable » aurait affiché deux fois la même offre. Ne pas la rechercher dans `profil.tsx`.
  🔴 **Et la rangée elle-même est partie le 2026-08-07 (A28)** : l'échéance se saisit, et
  le raccourci d'A14 est REVENU sous une autre forme — l'**estimation** sous le poids
  cible, « la première date que Kyroz peut tenir » + « Viser cette date » en un tap.
  Sur une base plus solide que la puce d'origine : cette date-là est tenable PAR
  CONSTRUCTION, là où celle d'A14 glissait de 98 jours quand on l'adoptait.

  **Suite tranchée par le fondateur (« 2 go ») et LIVRÉE le 2026-08-02** : la date
  réellement tenable est proposée **en un tap**, sous forme d'une puce de plus dans la
  rangée ÉCHÉANCE (`42 sem · tenable`) — pas dans une carte que le bouton Enregistrer
  recouvre. Un tap : l'échéance devient cette date, la phrase redevient `« Cible le
  24 mai 2027. »` (sans réserve) et la carte d'alerte cède la place à *« Rythme sûr, dans
  les clous de ta date. »*. L'option écartée (griser les échéances intenables) l'a été
  parce qu'elle se lit comme un reproche — CLAUDE.md §10.
  ⚠️ **L'éditeur RE-VÉRIFIE que la date tenue le sera avant de la proposer, et ce n'est
  pas de la prudence décorative** : la date d'atteinte dépend des calories servies, qui
  dépendent de l'échéance. Mesuré — H 83 kg → 70 : adopter la date projetée tient (elle
  avance même de 7 j). **F 78 kg → 65 : elle NE tient pas, la date glisse de 98 jours.**
  Cause : le rythme *requis* est calculé en LIGNE DROITE (écart ÷ semaines) alors que la
  *projection* SIMULE la trajectoire réelle, où le TDEE baisse avec le poids. Sur un gros
  écart relatif, viser la date projetée fait servir moins de déficit (le plancher ne mord
  plus, 1778 → 1940 kcal), le rythme tombe de 0,3 à 0,2 kg/sem, et aucune date ne
  converge : plus on la repousse, moins on creuse. Dans ce cas **aucune puce n'est
  proposée** — mieux vaut pas de raccourci qu'un raccourci qui ment. Verrouillé par
  `datedGoal.test.ts` → « A14 — adopter la date projetée ». 820 tests.

- ~~**A28 · l'échéance ne pouvait pas être une DATE — seulement une des cinq puces**~~
  ✅ **LIVRÉ le 2026-08-07** (demande fondateur : « date personnalisée pour l'objectif
  date de poids », puis « on enlève les propositions des semaines, on laisse que la date
  personnalisée »). `components/DateInput.tsx` · `goalLadder.ts::checkEcheance` ·
  garde-fous `goalLadder.test.ts` + `harnaisEcrans.test.ts`. **Aucun `ENGINE_REV`** :
  `datedGoalStatus` reçoit un stamp et se moque de sa provenance — pas une calorie ne
  change de règle.

  **Le manque.** A27 avait rendu la rangée honnête (chaque puce tient, chaque puce
  pilote), mais elle ne propose que **cinq dates**, et **un événement réel ne tombe
  jamais sur un multiple de semaines**. « Je me marie le 14 novembre » n'était pas
  exprimable. Trois champs jour/mois/année portent désormais la date visée — ils en sont
  aussi l'AFFICHAGE, donc ils ne coûtent aucune place à l'écran.

  🔴 **LA RANGÉE DE PUCES A ÉTÉ RETIRÉE, en second temps et sur décision du fondateur.**
  Livrée d'abord en complément (puces + date), elle est partie ensuite : on ne propose
  plus de durées, on demande une date. Trois conséquences, et il faut les distinguer :

  1. ✅ **`closestHorizon` s'en va, et c'est un gain.** Il allumait la puce la plus
     PROCHE de l'échéance enregistrée : une cible au 14 novembre affichait « 16 sem » en
     surbrillance **au-dessus d'une ligne annonçant une autre date** — deux échéances à
     l'écran pour un seul objectif. Défaut ANTÉRIEUR : la saisie libre l'a rendu
     regardable (les dates venaient toutes des puces, donc l'écart restait petit), le
     retrait l'a clos.
  2. ⚠️ **`deadlineLadder` reste APPELÉ, et ce n'est pas un reliquat** : la date
     **pré-remplie** sort de sa 2ᵉ marche. C'est maintenant la seule échéance que l'app
     propose, donc c'est elle qui doit tenir — vérifié à l'écran, un objectif neuf
     s'ouvre sur *« Rythme sûr, dans les clous de ta date »*. ➡️ **Le supprimer en
     croyant nettoyer du code mort ferait retomber le défaut d'origine d'A27** : une
     date par défaut que la moitié des gabarits ne peuvent pas tenir.
  3. ✅ **La perte a été refermée le jour même** : le raccourci « adopter en un tap la
     date tenable » (A14) revient sous forme d'ESTIMATION (ci-dessous), et sur une base
     plus solide que la puce d'origine.

  🎯 **L'ESTIMATION — troisième temps, décision fondateur** (*« on devrait peut-être
  donner une estimation, et l'user ajuste en fonction de ce qu'il veut et des
  plafonds »*). Sous le poids cible : *« À 79 kg, la première date que Kyroz peut tenir
  en sécurité : le 6 nov. 2026 »*, plus un **« Viser cette date »** en un tap. Le
  plafond est dit en DATE plutôt qu'en règle, et il est attaché au POIDS — c'est lui qui
  le détermine. Vérifié à l'écran : 79 → 6 nov. 2026 · 75 → 5 févr. 2027 · 70 → 7 mai
  2027 · 65 → 30 juil. 2027 · 60 → 15 oct. 2027. L'arbitrage poids ↔ date devient
  visible **avant** de s'engager, au lieu de se découvrir en se faisant refuser.

  🔴 **La source de cette estimation n'est PAS `status.projectedDate`, et l'écart est
  mesuré** (2026-08-07, 8 corps de référence) : **12 à 100 jours**, toujours dans le
  même sens.

  | | où j'arrive en GARDANT une date trop proche | première date TENABLE |
  |---|---|---|
  | `F 78 → 65` | 1ᵉʳ août 2027 | **28 mai 2027** |
  | `H 95 → 82` | 27 juin 2027 | **19 mars 2027** |
  | `F 60 → 57` | 14 oct. 2026 | **2 oct. 2026** |

  `projectedDate` simule qu'on GARDE l'échéance trop proche — donc qu'elle **expire**,
  après quoi le plan retombe au déficit ordinaire de l'objectif. C'est vrai, et
  inutilisable : ça revient à dire que **viser trop tôt fait arriver plus tard**. La
  marche 1 de l'échelle répond à la question réellement posée, « quand puis-je y être ? »,
  et elle est tenable PAR CONSTRUCTION (la sonde teste `reachableByDate`) — là où adopter
  `projectedDate` avait été mesuré comme **glissant de 98 jours** sur ce même gabarit
  (A14). ➡️ Les trois surfaces de l'éditeur — ligne sous le champ, carte « objectif
  ambitieux », carte « plancher » — servent désormais **le même** chiffre. Vérifié à
  l'écran : date au 1ᵉʳ sept. → les trois annoncent le 6 nov. 2026, et « Viser cette
  date » bascule bien sur *« Rythme sûr, dans les clous de ta date »*.

  🔎 **Un défaut TROUVÉ en mesurant ces cartes** : « Objectif ambitieux … après ta date »
  se déclenchait sur `clamped` **sans vérifier `reachableByDate`**. Balayage de 1 600
  échéances (8 corps × 200 semaines) : **1 cas** où elle s'affichait en même temps que
  *« Rythme sûr, dans les clous de ta date »* — `H 68 → 74`, **prise de masse**,
  17 semaines. Rare, mais deux phrases opposées dans le même écran. Gardée par
  `!reachableByDate`. ⚠️ **Encore un prédicat écrit en pensant à la sèche qui se trompe
  en PRISE** (cf. CLAUDE.md §6) : le réflexe vaut aussi pour les MESSAGES, pas seulement
  pour le moteur.

  ⚠️ **Et la ligne « Cible le … » devient le SEUL endroit qui dise si la date tient.**
  Toute la charge d'honnêteté de l'écran (A14/A15) repose sur elle : ne pas la
  raccourcir, ne pas la passer sous le pli, ne pas la réduire à un rappel de la date.

  📉 **La borne haute est MESURÉE, pas décrétée** (relevé du 2026-08-07). Au-delà de
  l'horizon de projection, le moteur fait **l'inverse** de ce qu'on lui demande :

  | corps | échéance à 5 ans (260 sem) | quelques semaines plus loin |
  |---|---|---|
  | `F 78 → 65` | **−55 kcal/j**, arrivée 2031 | **−418 kcal/j** (267 sem), arrivée mai 2027 |
  | `H 80 → 74` | **−25 kcal/j** | **−298 kcal/j** (274 sem) |

  Ce n'est pas un bug : passé 260 semaines la simulation ne peut plus atteindre la cible
  dans son horizon, `reachableByDate` tombe, **A15 conclut « la date ne tient pas » et
  sert le rythme sûr MAXIMAL**. Demander une échéance très lointaine ferait donc creuser
  au maximum. La bascule tombe APRÈS l'horizon et sa position **dépend du corps** (267 /
  274 sem) : on coupe à l'horizon, seul point défendable — au-delà, l'app n'a plus de
  projection à opposer à la date. ℹ️ **Aucune régression existante** : la rangée de puces
  ne dépasse jamais l'horizon. C'est une porte que la saisie libre OUVRAIT.

  🔴 **Second refus : l'échéance PASSÉE — et il s'applique à la date ENREGISTRÉE.**
  `datedGoalStatus` rend `active: false` dès que l'échéance est nulle ou dépassée :
  ré-ouvrir un objectif périmé et appuyer sur Enregistrer produisait un objectif qui
  **ne pilote rien tout en s'affichant comme s'il pilotait**. Le contrôle porte donc sur
  la date EFFECTIVE, quelle que soit sa provenance — c'est ce qui ferme ce cas, qui
  existait avant la saisie libre.

  ⚠️ **Rien ne refuse une date très PROCHE, et c'est délibéré.** Sous une semaine,
  `datedGoalStatus` raisonne sur une semaine pleine (garde-fou de division) : mesuré,
  **1 / 3 / 7 jours servent le même plan au kcal près et la même arrivée**. La phrase
  sous le champ annonce l'arrivée réelle, donc la question reçoit une réponse vraie.
  Refuser serait interdire sur le ton du reproche (CLAUDE.md §10). *Un test le fige :
  si le garde-fou de division disparaissait, ces trois dates cesseraient de coïncider.*

  ⚠️ **Pas de sélecteur de date** : dépendance NATIVE (build + revue, §2, voie OTA fermée
  pour les anciens binaires) pour un service que trois nombres rendent partout. Même
  arbitrage qu'à l'origine pour la date de naissance.

  🧩 **`DateInput` est une EXTRACTION, et ce qui est mis en commun n'est pas la mise en
  page** — c'est le garde anti-réécriture (`emitted`). Ce garde a été payé **trois fois**
  (§11 : « %MG saisi 23, enregistré 33 », puis « taper 31/02 vide les trois champs ») :
  le recopier dans un second fichier, c'était garantir qu'un des deux finisse par le
  perdre. `BirthDateField` garde ce qui lui est propre (âge minimum, année aberrante,
  repli des comptes sans date) et son API publique est **inchangée**.
  ⚠️ **Un piège évité de justesse pendant l'extraction** : le message « cette date
  n'existe pas » se déclenchait sur `age == null`, pas sur « aucun stamp produit ». Écrit
  naïvement `value == null`, il aurait **cessé de parler** pour une naissance en 2030 ou
  en 1800 — deux dates qui existent et ne donnent aucun âge lisible.

  🔒 **Le verrou du harnais a rougi, et il avait raison.** Les scripts Playwright
  remplissent la date de naissance **par son placeholder** (`fillPh('1994')`), et
  `harnaisEcrans.test.ts` exige que la valeur vive dans le fichier qui la rend. Les
  exemples étant devenus des propriétés, la table a gagné un `via` : la valeur doit être
  choisie dans l'écran ET passée au champ dans `DateInput`.
  ⚠️ **Première version vérifiée par mutation : elle ne gardait RIEN.** Elle cherchait
  « un placeholder transmis quelque part » — supprimer celui du champ *Jour* passait, les
  deux autres suffisant à la satisfaire. Chaque exemple est désormais lié à SON champ
  (`placeholder={placeholders?.d}`), et les deux mutations rougissent séparément.
  ➡️ **Un verrou qui accepte n'importe lequel des trois maillons ne garde aucun des trois.**

  ✅ **Vérifié par mutation** (5 au total, toutes rouges) : refus de la date passée
  retiré · borne haute ouverte d'une semaine · message découplé de `MAX_PROJECTION_WEEKS`
  · placeholder du champ Jour supprimé · exemple d'année changé dans l'écran.
  **1 248 tests verts, 74 fichiers, `tsc` propre** — mesuré après fusion. *(La fiche a
  d'abord annoncé « 1 152 / 70 », vrai sur la branche isolée et faux dès le rebase : le
  compte de tests n'appartient pas au chantier qui l'écrit.)*

- ~~**A27 · la rangée d'échéances ne proposait que de l'impossible à la moitié des
  gabarits**~~ *(publiée par erreur sous le numéro **A26**, déjà pris par « régénérer
  oubliait ce qui avait été mangé » — deux fiches sous une même référence, donc une
  référence qui ne désigne plus rien ; renumérotée le 2026-08-03)*
  ✅ **TRANCHÉ ET LIVRÉ le 2026-08-03** (fondateur : « puces dynamiques »).
  `lib/goalLadder.ts` · garde-fou `lib/__tests__/goalLadder.test.ts` · contrôle
  **`npm run mesure:objectif`**.

  🔴 **CETTE RANGÉE N'EST PLUS AFFICHÉE depuis le 2026-08-07 (A28)** — ne pas la
  chercher dans `profil.tsx`, l'échéance se SAISIT. Le mécanisme, lui, tourne toujours :
  il produit l'**estimation** (« la première date que Kyroz peut tenir ») et la date
  **pré-remplie**. Tout ce qui suit sur les invariants, le coût des sondes et la
  mémoïsation reste donc VRAI ; seul « la personne choisit dans la rangée » ne l'est
  plus. ⚠️ Et c'est ce qui interdit de supprimer `goalLadder.ts` comme du code mort.

  **Le défaut.** La rangée offrait CINQ DURÉES FIGÉES (4 / 8 / 12 / 16 / 24 semaines).
  Mesuré : **4 corps de référence sur 8 n'avaient AUCUNE échéance tenable**, la première
  réellement atteignable se situant entre 18 et 82 semaines — hors de la rangée. La
  personne choisissait donc dans une liste où chaque option lui répondait « tu y
  arriveras après ta date ».

  ⚠️ **Et c'était PIRE que ça, découvert en mesurant l'après.** La rangée figée ne
  servait pas seulement des dates fausses : sur 5 corps sur 8, **ses cinq boutons
  servaient UN SEUL ET MÊME PLAN** (mêmes calories au kcal près). Sous une certaine
  durée, le plancher d'énergie disponible borne le déficit — allonger l'échéance ne
  change alors rien à l'assiette. C'est exactement A23 (« un réglage qui ne pilote
  rien »), et personne ne l'avait vu parce que la fiche ne mesurait que la tenabilité.
  ➡️ **Quand on remplace un composant, mesurer AUSSI ce qu'on ne l'accusait pas de faire.**

  **Ce qui est livré.** Les cinq durées sont dérivées du corps. Deux invariants, et il
  faut les deux — le premier seul donnerait une rangée honnête mais décorative :
  1. **chaque puce tient** — la première est l'échéance la plus courte que les
     garde-fous laissent tenir, les suivantes sont plus longues donc plus faciles ;
  2. **chaque puce est un plan différent** — l'échelle cherche d'abord la durée à
     partir de laquelle le plan DÉCOLLE du plancher, et n'étale les puces qu'à partir
     de là.

  | | puces tenables | puces servant un plan distinct |
  |---|---|---|
  | 5 durées figées | **9 / 40** | **14 / 40** |
  | échelle dérivée | **40 / 40** | **40 / 40** |

  ⚠️ **L'échelle INTERROGE le moteur, elle ne rejoue pas ses formules** (CLAUDE.md §10) :
  `deadlineLadder` reçoit une sonde, comme `datedGoalStatus` reçoit un projecteur. Coût
  mesuré : ~17 sondes, 3 à 45 ms sur les gabarits courants, **283 ms** sur le cas extrême
  (F 110 → 80, écart de 30 kg). ➡️ **Mémoïsé sur le poids cible** dans `profil.tsx` —
  sans ça, la saisie du poids serait saccadée.

  ⚠️ **La dichotomie repose sur une propriété MESURÉE, pas garantie par le code** : une
  fois qu'une durée tient, toutes les durées plus longues tiennent. Aucune ligne de
  `datedGoal.ts` ne l'impose. Un test balaye l'horizon et exige l'absence de trou — si
  la propriété tombe, la première puce deviendrait fausse **en silence**.

  ⚠️ **En PRISE de masse, les calories servies BAISSENT quand la date s'éloigne** (le
  surplus se dilue). Le test « le plan a-t-il décollé du plancher ? » est donc écrit
  `!==` et non `>` : une première version orientée perte marchait sur la prise **par
  accident**, en retombant sur un cas particulier.

  ℹ️ La puce « N sem · tenable » livrée en A14/A15 a été **retirée** : la première puce
  de la rangée est désormais, par construction, l'échéance la plus courte qui tienne.
  La garder afficherait deux fois la même offre. Les cinq durées figées survivent en
  **repli** (`HORIZONS_REPLI`) pour le seul cas où rien n'est tenable dans l'horizon de
  projection — le poids visé est alors hors de portée quelle que soit la date, et c'est
  la phrase sous le champ qui le dit. *(« Sous la rangée » à l'époque : elle n'existe
  plus depuis A28, et `HORIZONS_REPLI` ne sert plus qu'à pré-remplir le champ.)*
  ℹ️ Défaut d'un objectif neuf : la **2ᵉ** puce, pas la 1ʳᵉ. La première est le rythme
  sûr maximal, et un défaut ne pousse pas d'office quelqu'un au plafond de ce que la
  sécurité autorise (CLAUDE.md §10).
  ⚠️ Ne pas griser les puces intenables : écarté en A14, ça se lit comme un reproche.
  🔎 **Vérifié à l'écran** (H 83 → 70, le cas qui avait déclenché la fiche) : rangée
  `39 sem · 42 sem · 52 sem · 16 mois · 21 mois`, phrase « Rythme sûr, dans les clous de
  ta date », et le choix PILOTE — 42 sem sert 2251 kcal/j (−340), 21 mois sert
  2436 kcal/j (−155). Avant : cinq puces dont « 4 sem » annonçait le 30 août 2026 pour
  une arrivée réelle le 19 juin 2027.

- ~~**A15 · sur un gros écart, l'objectif daté se dessert lui-même**~~
  ✅ **TRANCHÉ ET LIVRÉ le 2026-08-03** (fondateur : « les deux »). `ENGINE_REV` 4 → 5.
  Contrôle re-mesurable : **`npm run mesure:objectif`**.
  ⚠️ Ce que cette fiche a laissé OUVERT est sorti en **A27** ci-dessus — il était enterré
  dans une fiche marquée ✅ LIVRÉ, donc invisible pour qui cherche du travail à faire.

  🔎 **La fiche se trompait sur un point, et ça a changé le chantier.** Elle affirmait
  « **il n'existe aucune date d'équilibre** ». Faux : elle existe sur les 8 corps de
  référence. Ce qui ne converge pas, c'est **UN SEUL aller-retour** — exactement ce que
  fait l'écran avant de renoncer. En itérant l'adoption, ça converge en 3 à 11 tours.
  L'arbitrage réel n'était donc pas « aucune date » contre « une date », mais **« la
  date d'équilibre, lente » contre « la date au rythme sûr maximal, plus proche »**.

  📉 **Ce que la mesure a trouvé, et que la fiche ne disait pas** (8 corps × 11 échéances) :
  - **5 corps sur 8 : AUCUNE des 5 échéances de l'écran n'est tenable.** La première
    tenable est à 18–82 semaines — hors de la rangée de puces.
    ℹ️ Chiffre mesuré **AVANT** A15. Après A15 il tombe à **4 sur 8** (servir le rythme
    sûr maximal rapproche l'arrivée, donc une échéance de plus devient tenable), et c'est
    ce 4/8 que cite A27. Les deux sont justes, à deux instants différents — ne pas les
    lire comme une contradiction.
  - **3 sur 8 (les trois femmes à gros écart) : la date de repli affichée GLISSE dès
    qu'on l'adopte**, jusqu'à **+96 jours**. C'est le défaut de fond : Kyroz affichait
    une date qui n'était vraie que tant qu'on ne s'en servait pas.
  - ⚠️ **Une mesure ÉCARTÉE, pour mémoire** : « l'arrivée est-elle monotone en la date
    choisie ? » donne 8/8 et c'est un **faux positif**. Sur un objectif confortable, une
    date lointaine DOIT servir un déficit plus doux (`F 60 → 57` : J+52 à 8 semaines,
    J+655 à 104 — les deux honnêtes). Le premier indicateur écrit était le mauvais.

  🔧 **Le correctif, en une phrase** : servir juste ce qu'il faut TANT QUE ça suffit ;
  dès que ça ne suffit plus, servir le **maximum sûr** et dater la trajectoire là-dessus.
  Le rythme cesse alors de dépendre de l'échéance, donc **la date projetée devient un
  point fixe** — et (a) tombe tout seul, sans itération dans l'écran.
  Mécanique : `WeeklyProjector` accepte un `kcalDeltaOverride`, `weeksToTargetSimulated`
  sait simuler au rythme maximal, et **`computePlan` passe désormais un projecteur**
  (`lib/tdee.ts`) — sans quoi les écrans auraient affiché la trajectoire corrigée
  pendant que l'assiette servait l'ancienne. Aucune récursion : l'appel intérieur du
  projecteur reste `project: null`.

  📊 **Mesuré avant / après, même code** :

  | | avant | après |
  |---|---|---|
  | la date promise glisse dès qu'on l'adopte | **3/8** | **0/8** |
  | `F 78 → 65` — arrivée · cible | J+576 · 1940 kcal | **J+419 · 1731 kcal** |
  | `F 70 → 62` | J+339 · 1842 kcal | **J+188 · 1638 kcal** |
  | `F 65 → 58` | J+270 · 1731 kcal | **J+143 · 1540 kcal** |
  | les 5 hommes + `F 60` | — | **inchangés, au kcal près** |
  | puce « N sem · tenable » sur `F 78 → 65` *(puce supprimée depuis, cf. A27)* | ❌ aucune | ✅ `63 sem` |
  | `computePlan` | 0,026 ms | 0,11 ms (0,47 au pire) |

  ⚠️ **Aucun garde-fou n'est franchi, et c'est balayé par un test** (`A15 — creuser plus
  ne franchit AUCUN garde-fou`, 7 corps × 6 échéances) : rythme sûr modulé par
  l'adiposité, plafond des 25 % du TDEE, plancher d'énergie disponible. On ne va pas
  plus vite que ce que la sécurité autorisait **déjà** à qui avait choisi une date proche.

  🔁 **Deux arbitrages écrits ont été rouverts, sur décision du fondateur** :
  1. **A14** — « aucune puce n'est proposée » sur le gros écart. La puce est désormais
     proposée partout, parce que la date tient. Le test qui gravait l'exception
     (`f.apres.reachableByDate === false`) exigeait en réalité le DÉFAUT : il exige
     maintenant l'inverse.
  2. **P1.6** — « display-only : aucune calorie servie ne bouge ». A15 en déplace
     délibérément. ⚠️ **Et son test est resté VERT** : ses deux gabarits sont
     atteignables des deux côtés, donc il ne touchait jamais le cas qui change. Un
     garde-fou qui a cessé de garder sans rougir. Il vérifie maintenant la FRONTIÈRE
     dans les deux sens (atteignable → rien ne bouge · hors de portée → ça doit bouger).

  ✅ **Vérifié à l'écran** (web, profil F 78 → 65 kg à 8 semaines) : la carte annonce
  « Plutôt le 19 oct. 2027 · 0,3 kg/sem » pour 1731 kcal — les valeurs mesurées.

- ~~**A15-bis · le couloir de progression accusait l'utilisateur d'un retard imposé
  par l'app**~~ ✅ **LIVRÉ le 2026-08-03**, dans la foulée d'A15. Display-only : aucune
  calorie ne bouge, donc **pas d'`ENGINE_REV`**.

  Le couloir (`WeightChart`, « ▚ Ta zone vers X kg le … · **rester dedans suffit** ») et
  le verdict `trackStatus` étaient bâtis sur `idealWeightAt` : une **ligne droite** du
  poids de départ au poids cible sur la date **SAISIE** — exactement le raccourci qu'A15
  venait de retirer du moteur, resté dans l'affichage. Vu à l'écran, l'un au-dessus de
  l'autre : couloir vers le **28 sept. 2026**, carte annonçant le **19 oct. 2027**.
  **387 jours d'écart sur le même écran.**

  📉 **Mesuré sur un utilisateur qui suit le plan À LA LETTRE** (sa courbe EST celle que
  le moteur simule), 8 corps × 2 échéances :

  | | avant | après |
  |---|---|---|
  | cas où l'app affiche « en retard » | **11/16** | **3/16** |
  | `F 78 → 65` à 8 sem — sortie de zone | **J+7** | J+56 |
  | `H 83 → 70` à 8 sem — sortie de zone | **J+7** | jamais |
  | pire écart au couloir à la date promise | **+10,5 kg** | **+1,1 kg** |

  ➡️ Le couloir vise désormais la date que le moteur TIENDRA (`trackingTarget`, dans
  `lib/tdee.ts`) — un point fixe depuis A15, donc il ne se déplacera pas sous les pieds
  de l'utilisateur. Les 3 cas restants sortent tard (J+56 à J+266) : c'est l'escalade de
  zone basse qui courbe la trajectoire en cours de route, et aucune bande droite ne peut
  la suivre.

  🔎 **Le principe était DÉJÀ écrit dans ce fichier**, pour un autre cas : *« Reprocher
  un retard qu'on a soi-même imposé est la définition exacte de la charge mentale qu'on
  refuse »* (`trackStatus`, cas « déficit bloqué »). Il manquait pour le cas « date hors
  de portée », qui est le plus fréquent. ➡️ **Quand on écrit un principe pour un cas,
  chercher tout de suite les autres cas qu'il couvre.**

  ✅ Vérifié à l'écran : couloir et carte annoncent la même date.

  <details><summary>Diagnostic d'origine (conservé)</summary>

  Découvert en livrant A14, mesuré, **non corrigé** à l'époque (ça déplacerait des
  calories → `ENGINE_REV`, donc arbitrage fondateur obligatoire).
  Le moteur sert le déficit **REQUIS pour la date**, plafonné au rythme sûr. Quand la
  cible est hors de portée, repousser la date baisse donc le déficit servi — et éloigne
  l'arrivée. F 78 kg → 65 kg : à 8 semaines il sert le plancher (1778 kcal, 0,3 kg/sem) ;
  en visant la date que ce rythme projette, il ne sert plus que 1940 kcal (0,2 kg/sem) et
  la date part 98 jours plus loin. **Il n'existe aucune date d'équilibre.**
  *(❌ Cette dernière phrase était FAUSSE — cf. le correctif ci-dessus. Elle est laissée
  telle quelle parce qu'elle a orienté le chantier pendant un jour : une affirmation
  écrite de bonne foi et jamais re-mesurée finit par décider à la place de la mesure.)*
  Question de fond : quand l'objectif est hors de portée, faut-il servir le **rythme sûr
  MAXIMAL** (et annoncer la date qui en découle) plutôt que le rythme « juste requis » ?
  ⚠️ Ne pas confondre avec un défaut de sécurité : les deux comportements restent
  au-dessus du plancher. C'est un choix de pilotage, pas un garde-fou.

  </details>

- ~~**A16 · `Alert.alert` ne fait RIEN sur le web — dix interactions mortes**~~
  ✅ **CORRIGÉ le 2026-08-02.** Remonté par le fondateur : *« le bouton régénérer mon
  plan ne fonctionne pas »*. La cause n'était pas dans ce bouton :
  `class Alert { static alert() {} }` — une fonction vide dans react-native-web. Aucune
  erreur, aucune trace.
  **Les dix appels de l'app étaient morts sur le web**, et pas seulement des
  cosmétiques : « Régénérer mon plan » · **l'onboarding qui REFUSE un profil inéligible**
  (mineur, IMC de départ — bouton final inerte, sans message : le garde-fou §6 devenait
  invisible) · suppression d'une pesée · export RGPD · erreur de validation de
  « Calories & macros » · message « rappel indisponible sur le web » · contact support.
  ℹ️ `WeightCheckin` s'en était déjà sorti seul avec un `window.confirm` : le piège avait
  été rencontré **une fois, jamais généralisé** — et la boîte grise du navigateur est
  hors charte.
  **Correctif** : `components/Dialog.tsx` (`useDialog()` → `confirm` / `notify` /
  `choose`) remplace `Alert` PARTOUT, web ET natif — un seul chemin, une seule
  apparence, bâti sur l'`ActionSheet` déjà thémée et déjà bornée sur tablette. Il rend
  une **promesse** (`if (await confirm(...))`) au lieu d'éparpiller la suite dans des
  callbacks. Garde-fou : `noAlert.test.ts`, **vérifié en réintroduisant volontairement
  un `Alert`** — le piège est invisible à la relecture, seul un test peut le tenir fermé.
  Vérifié à l'écran : dialogue → confirmation → `/plan`, seed 0 → 1, recettes changées.

- ~~**A17 · L'âge était saisi une fois, puis il pourrissait**~~ ✅ **LIVRÉ le 2026-08-02**
  (demande du fondateur). L'app demandait un ÂGE : juste le jour de la saisie, faux dès
  le premier anniversaire, et personne ne revient le corriger. Ce n'est pas cosmétique —
  l'âge entre dans **Mifflin-St Jeor**, donc dans le TDEE, donc dans les calories
  servies tous les jours.
  Désormais on demande la **date de naissance**, et `age` en est **DÉRIVÉ dans
  `computePlan`** — le producteur unique, donc aucun écran ne peut l'oublier. Il se
  remet à jour à la première ouverture qui suit l'anniversaire.
  ⚠️ **`age` est CONSERVÉ, et ce n'est pas une redondance oubliée** : on ne peut pas
  deviner la date de naissance des comptes existants (un âge ne donne qu'une fourchette
  d'un an). Ces profils gardent leur âge saisi tant qu'ils n'ont pas renseigné leur
  date — aucune valeur inventée, aucune migration de données. L'écran le dit :
  *« Âge enregistré : 32 ans. Renseigne ta date de naissance pour qu'il se mette à jour
  tout seul. »*
  Saisie en **trois champs** (jour / mois / année) et non un date-picker, même raison
  que les puces d'échéance : lourd sur le web. Les dates fantômes sont refusées (31/02,
  29/02 hors bissextile) et l'âge déduit s'affiche en direct.
  🎂 **Animation d'anniversaire** (`BirthdayCelebration`) une fois l'an à l'ouverture du
  Plan — l'année vue est stockée, pas un booléen (rien ne le remettrait à zéro).
  Confettis à positions FIXES : `Math.random()` rendrait l'animation intestable.
  ⚠️ Ce n'est pas de la gamification de compétition (§5) : rien n'est gagné ni comparé.
  Et c'est le jour où la dépense estimée bouge toute seule — autant que ça se voie.
  ✅ **MIGRATION JOUÉE** — `supabase/migrations/2026-08-02_profiles_birth_date.sql`,
  **vérifiée contre la prod le 2026-08-02** (`birth_date` → `HTTP 200`, les 37 colonnes
  de `PROFILE_COLS` en une requête → `200`, témoin négatif → `400`). Détail et commande
  reproductible : `supabase/JOURNAL-MIGRATIONS.md`.
  ⚠️ **Cette ligne a dit « À JOUER » alors qu'elle l'était déjà, et une session l'a
  répété au fondateur sans mesurer.** Une migration ne se déclare pas en attente parce
  que son fichier est dans le dépôt : le dépôt ne sait rien de la prod. La seule preuve
  est la réponse de PostgREST — c'est une commande d'une ligne, il n'y a aucune excuse
  à ne pas la lancer avant d'annoncer un blocage.
  18 tests ajoutés, **830 au total**. Vérifié à l'écran : saisie, date impossible,
  refus < 18 ans, repli des comptes sans date, animation, et non-rejeu au rechargement.

- ~~**A18 · Le dépistage santé n'avait pas de « Non »**~~ ✅ **CORRIGÉ le 2026-08-02**
  (remonté par le fondateur).
  Chaque situation était un simple interrupteur : on tapait la carte pour dire « oui »,
  et **« non » n'existait pas — c'était l'ABSENCE de tap**. Rien ne distinguait donc
  *« j'ai lu et je ne suis pas concerné »* de *« je n'ai rien vu et j'ai filé vers le
  bouton »*. Sur une préférence, ça passe ; sur le portail qui décide si l'app a le
  droit de servir un moteur de déficit calorique (CLAUDE.md §6), non.
  **Correctif** : réponses en TROIS états (oui / non / pas encore répondu). Chaque
  situation porte un `Non / Oui` explicite, et « Continuer » reste désactivé tant que
  les deux ne sont pas répondues — avec le motif affiché (*« Réponds aux deux questions
  pour continuer. »*), sans reproche.
  ℹ️ **L'attestation est CONSERVÉE** : elle couvre plus que les deux situations listées
  (« je confirme être un adulte en bonne santé »). Trois taps au lieu d'un sur un écran
  vu **une seule fois** : le coût est nul, retirer une attestation explicite pour
  l'économiser n'en est pas un.
  ℹ️ `SCREENING_VERSION` reste à **1**, à dessein : les critères dépistés n'ont pas
  changé, seule la façon de répondre. L'incrémenter re-dépisterait tout le monde pour
  rien.
  La logique bloquante (`screeningBlocked`, testée) n'a pas bougé : seule la façon de
  renseigner les drapeaux change. Vérifié à l'écran sur les deux chemins — « Non/Non +
  attestation » débloque, « Oui » mène au cul-de-sac.

- ~~**A19 · Allègement du profil : bouclier retiré, carte de série resserrée**~~
  ✅ **FAIT le 2026-08-02** (décision fondateur).
  **Bouclier retiré de l'AFFICHAGE, mécanisme INTACT** : `advanceStreak` pardonne
  toujours un jour manqué, et le toast de l'écran Plan (*« Série protégée »*) le dit
  **au moment où ça sert**. Ce qui saute, c'est le statut permanent « 🛡️ Prêt » et sa
  notice explicative : ils commentaient en continu une mécanique qui ne concerne
  l'utilisateur qu'un jour sur sept au pire. ⚠️ Ne pas réintroduire l'affichage sans
  nouvelle décision — et ne pas confondre avec une suppression de la feature (§5
  l'autorise explicitement).
  **Carte resserrée** : compteur 52 → 36 pt, padding et gouttières réduits, notice
  supprimée. Mesuré à l'écran (430 × 932) : **≈ 370 → ≈ 190 pt**, soit « Préférences
  alimentaires » désormais visible sans défiler. Le chaînon de 7 jours ne bouge pas —
  c'est le North Star.
  **Ligne d'âge retirée** : le champ ne commente plus une saisie valide. Il ne parle
  que pour ce qui bloque (date impossible, < 18 ans) ou ce qui manque (compte sans date).
  L'âge reste lisible sur la ligne « Informations », donc une faute de frappe se voit.
  ⚠️ **Défaut attrapé en vérifiant — TROISIÈME occurrence du piège « 23 → 33 »** : taper
  une date impossible (31/02) émettait `undefined`, le parent le renvoyait, et la
  synchro `valeur → texte` **vidait les trois champs sous les doigts** — l'écran
  affichait alors « renseigne ta date » au lieu de « cette date n'existe pas ». Le clamp
  n'était jamais le vrai coupable : c'est la synchro descendante. Garde `emitted` (on
  ignore ce qui nous revient de nous-même). Règle généralisée dans CLAUDE.md §11.

- ~~**A20 · Le haut du Profil donnait la vedette à la série, pas au poids**~~
  ✅ **FAIT le 2026-08-02** (décision fondateur, suite de A19).
  **L'ordre était l'inverse de l'importance réelle.** Le poids ALIMENTE le moteur —
  chaque pesée recalcule TDEE, macros et plan — et il tenait dans une ligne de menu
  (« Suivi du poids · 82 kg »). La série, qui ne raconte que l'assiduité, occupait une
  grosse carte en haut d'écran. Les deux ont échangé leur place.
  **Nouveau `WeightSummaryCard`** : poids courant en gros, écart avec la pesée
  précédente, mini-courbe (`WeightChart`, avec la trajectoire cible si un objectif daté
  est posé), et un bouton qui devient « Me peser » quand une pesée est attendue. Sans
  historique : une invitation, pas un vide.
  ⚠️ **Deux choix de fond, pas cosmétiques** :
  1. **La carte affiche le poids du PROFIL, pas la dernière pesée.** C'est celui que le
     moteur utilise. Les deux diffèrent après un backfill (pesée saisie à une date
     passée) — montrer l'autre serait un chiffre faux au sens de « pas de mensonge ».
  2. **L'écart est en couleur NEUTRE.** Une hausse n'est pas une faute : la règle
     produit (§10) veut que tout suivi rassure. Pas de rouge, pas de flèche dramatique.
  **Série réduite à une LIGNE** : 🔥 compteur + « record N j » + le chaînon de 7 jours.
  Le chaînon reste parce qu'il EST le North Star ; ce qui saute (compteur géant,
  prochain palier) ne change rien à ce qu'on fait de sa journée.
  ℹ️ Le variant s'appelle toujours `card` — nom conservé pour ne pas toucher aux
  appelants, mais il rend une ligne. Ne pas réintroduire la grosse carte sans décision.

- ~~**A21 · « Régénérer mon plan » resservait le même plan**~~
  ✅ **FAIT le 2026-08-02** (remonté DEUX FOIS par le fondateur).
  ⚠️ **Le premier diagnostic était juste et INCOMPLET, et c'est ça la leçon.** À A16 on
  a trouvé `Alert.alert` mort sur le web et conclu que le bouton était réparé : la boîte
  de confirmation s'affichait enfin, le drapeau `planReroll` était bien consommé, le
  seed bien incrémenté. Tout le chemin fonctionnait. **Mais le plan servi ne changeait
  presque pas** — donc pour l'utilisateur, rien n'avait bougé. On avait vérifié la
  MÉCANIQUE, pas le RÉSULTAT.
  **La cause, mesurée** (`scripts/mesure-reroll.ts`, sonde temporaire dans le moteur) :
  le `seed` n'était qu'une clé de départage placée SOUS trois nudges (besoin, famille,
  fibres) qui sont ABSOLUS — à pool identique ils désignent toujours le même gagnant. Le
  pool de variantes contenait **7,83 recettes**, le groupe que le seed pouvait vraiment
  arbitrer **1,30** — et **une seule dans 77,8 % des sélections**. Résultat vécu : le
  1er repas affiché en arrivant sur l'écran Plan changeait **13,7 %** du temps.
  **Le correctif inverse les rôles** : les nudges CLASSENT, le seed CHOISIT parmi les
  premiers du classement — exactement le motif de `swapMeal` (« Échanger ce repas »),
  qui lui a toujours marché. Deux compensations rendent aux nudges ce que le tirage leur
  prend, en les repliant dans le SCORE plutôt que dans le départage
  (`FIBER_SELECT_W_VARIANT`, `FAMILY_SELECT_W_VARIANT`), plus un plancher de qualité.
  **Bilan mesuré (48 profils × 8 rerolls · 240 semaines simulées) :**
  ℹ️ Chiffres **historiques, valables au moment d'A21**, quand le tirage était le même pour
  les trois réglages de variété. **A23 les a remplacés par un jeu par réglage** — pour
  l'état courant, voir la fiche A23 ou la photo en tête de fichier. Conservés ici parce
  qu'ils mesurent ce que CE correctif a produit.
  | | avant | après A21 |
  |---|---|---|
  | 1er repas affiché qui change | 13,7 % | **78,0 %** |
  | semaine renouvelée | 43,4 % | **90,4 %** |
  | positions figées sur 8 rerolls | 31,5 % | **0 %** |
  | quasi-doublons de famille | 27,9 % | **24,6 %** |
  | repas à drapeau bloquant /6 720 | 14 | **5** |
  | fibres en sèche, g/1 000 kcal | 20,59 | **21,24** |
  Les contrôles de qualité vont donc tous dans le bon sens — mais **seulement** grâce aux
  compensations : à la première tentative (seed libéré, rien d'autre) ils se dégradaient
  TOUS (quasi-doublons 41,7 %, fibres 18,72, drapeaux 22).
  ⚠️ **Une régression que J'AI introduite, et que les moyennes ne voyaient pas.** En
  renforçant le biais fibres, le plancher de qualité pouvait ne laisser qu'UNE recette
  servable sur un créneau — servie alors **7 jours d'affilée**. Toutes les mesures de
  renouvellement restaient au vert : un moteur qui sert la même recette tous les jours
  mais une AUTRE à chaque reroll les passe toutes. ➡️ **Mesurer le RENOUVELLEMENT ne dit
  rien de la RÉPÉTITION.** Contrôle « créneaux MONOPOLISÉS » ajouté au script, exception
  `monopole` ajoutée au moteur, et un cas de test par profil. Ne pas les retirer.
  ℹ️ **`ENGINE_VERSION` n'a PAS été bumpé, à dessein** : le plan canonique (seed 0) est
  inchangé — vérifié sur 144 combinaisons. Bumper aurait ramené de force au plan
  canonique les gens qui avaient justement demandé un reroll.
  ℹ️ **Nouveau filet** : `lib/__tests__/reroll.test.ts` (52 cas). Vérifié qu'il attrape
  bien le défaut — **24 de ses 52 cas tombent** sur le moteur d'avant. Aucun des 830
  tests existants ne pouvait le voir : ils vérifient tous qu'UN plan est correct, jamais
  que DEUX plans successifs diffèrent.

- ~~**A22 · Deux champs de profil hors barème — dont un qui tuait un écran**~~
  ✅ **FAIT le 2026-08-02** (trouvé en voulant exécuter « mets variété max »).
  Le fondateur demande de passer sa variété au maximum. En allant le faire, deux
  valeurs impossibles apparaissent sur son profil RÉEL :
  | champ | valeur trouvée | attendu |
  |---|---|---|
  | `variety` | `'high'` | `'repetitive' \| 'balanced' \| 'max'` |
  | `meals` | `4` (un NOMBRE) | `MealType[]` |
  ⚠️ **Aucune des deux ne vient d'une ancienne version** : l'énumération `variety` est
  identique depuis le commit initial (vérifié dans l'historique), et `meals` a toujours
  été un tableau. Ce sont des saisies à la main — test, édition directe en base.
  **Ce qu'elles faisaient, et pourquoi personne ne l'avait vu :**
  · `variety: 'high'` — le moteur ne reconnaissant ni `repetitive` ni `max`, il servait
    « équilibré ». Réglage INOPÉRANT. Et dans l'éditeur, `selected={variety === v.value}`
    ne matchait rien : **aucune carte sélectionnée**, donc même pas constatable.
  · `meals: 4` — le moteur s'en sortait (`buildLocalPlan` teste `Array.isArray` et
    retombe sur 4 repas), donc **le plan servi était juste et le défaut invisible**.
    Mais l'écran « Paramètres des repas » CRASHAIT : `useState(profile.meals ?? [...])`
    ne rattrape rien (`4 ?? x` vaut `4`), puis `meals.includes(…)` lève
    « meals.includes is not a function » → Error Boundary. **L'écran était mort.**
  ➡️ **C'est ça qui l'empêchait de changer sa variété lui-même** : le réglage vivait
  derrière un écran qui ne s'ouvrait plus, et rien ne disait pourquoi.
  **Correctif — deux couches, volontairement :**
  1. `normalizeVariety` / `normalizeMeals` dans `syncGuard.ts`, appliqués aux DEUX
     chemins de lecture (local `useProfile`, cloud `sync.ts`) — même motif que
     `normalizeGoal`. `'high'` → `'max'` (intention sans ambiguïté), `'low'` →
     `'repetitive'`, tout autre inconnu → `'balanced'`. Un `meals` numérique N devient
     les N premiers de `MEAL_ORDER` — pour N = 4, exactement ce que le moteur servait.
  2. L'éditeur teste `Array.isArray` au lieu de `??`. Un écran ne doit pas mourir sur
     une donnée inattendue, même une fois la donnée réparée en amont.
  ℹ️ **Aucune écriture sur le compte du fondateur.** La normalisation agit à la LECTURE :
  son profil stocké garde `'high'`/`4`, l'app sert `'max'` + 4 repas, et la valeur propre
  sera persistée à son prochain enregistrement. Vérifié à l'écran : l'éditeur s'ouvre,
  « Variété max » est coché, le plan se régénère (`v: "max"`, 28 recettes distinctes
  sur 28 repas). ⚠️ Ça régénère le plan une fois — `variety` est dans `profileSignature`.
  ⚠️ **Leçon de méthode** : le moteur avait un repli défensif sur `meals`, l'écran non.
  Un repli à un seul étage ne protège que le chemin où il est posé — et c'est l'autre
  chemin qui a cassé. Chercher TOUS les consommateurs d'un champ, pas seulement celui
  qui compte le plus.
  ℹ️ **Trouvé au passage, non corrigé** : `balanced` et `max` donnent des plans
  canoniques différents, mais un **reroll strictement identique** — le tirage de
  « Régénérer » construit son panier sur `VARIANT_BAND` et ignore la bande de variété.
  Le réglage n'a donc aucun effet sur ce bouton. À arbitrer (cf. A21).

- ~~**A23 · « Variété max » ne changeait rien au bouton « Régénérer »**~~
  ✅ **FAIT le 2026-08-02** (décision fondateur : « oui go », après le constat d'A22).
  **Les trois cartes de l'écran promettaient trois comportements dont un seul existait.**
  Mesuré : `balanced` et `max` rendaient un reroll **identique au bit près** — le plan
  canonique différait bien, mais dès qu'on régénérait, « Le plus de diversité » n'en
  donnait pas plus que « Routine et variété ». Le tirage construisait son panier sur ses
  propres constantes (`VARIANT_BAND` / `VARIANT_POOL`) et ignorait `variety`.
  **Correctif** : `REROLL_PAR_VARIETE` — bande, taille du panier, nombre de candidats que
  le seed départage, et seuil de silence des nudges, un jeu par réglage.
  | | 1er repas | semaine | recettes/4 sem | quasi-doublons | drapeaux | fibres sèche |
  |---|---|---|---|---|---|---|
  | **avant** (les 3) | 13,7 % | 43,4 % | 41 | 27,9 % | 14 | 20,59 |
  | repetitive | 51,2 % | 74,0 % | 30 | 22,5 % | 5 | 20,28 |
  | balanced | 78,0 % | 90,3 % | 62 | **20,0 %** | 5 | 21,02 |
  | max | 82,7 % | 92,4 % | 63 | **20,8 %** | 6 | 20,63 |
  ℹ️ Colonne « quasi-doublons » **re-mesurée après A25** (elle mêle seed 0 et rerolls, et
  A25 a changé le seed 0) : `balanced` 27,5 → 20,0 %, `max` 26,3 → 20,8 %, `repetitive`
  inchangé — son plan canonique ne passe pas par la famille. Les colonnes de
  renouvellement, elles, ne mesurent que des rerolls : vérifiées identiques au dixième.
  **Aucun réglage n'est sous l'état d'avant sur un seul contrôle**, et l'ordre suit enfin
  ce que les cartes annoncent. `repetitive` sert moins de recettes distinctes (30 vs 62) :
  c'est le but. Le prix de `max` est lisible — un peu de fibres et de rotation par famille
  échangées contre de la diversité, ce que le réglage veut littéralement dire.
  ⚠️ **Forme choisie : `balanced` garde EXACTEMENT la ligne calibrée en A21, et c'est
  `max` qui s'élargit au-dessus.** Première tentative inverse (resserrer `balanced` sous
  `max`) : un test est tombé — `sèche · vegan`, jour 1 à **32 %** contre 61 %. Resserrer
  coûte cher sur les pools étroits. Élargir par le haut ne fait perdre à personne ce qui
  venait d'être livré une heure plus tôt.
  ⚠️ **L'exception anti-monopole (A21) est désactivée en `repetitive`.** Casser un
  monopole là où l'utilisateur a demandé « souvent les mêmes plats », c'est défaire son
  choix — et le payer en repas hors cible : **22 drapeaux contre 5** tant qu'elle
  s'appliquait. Un garde-fou générique peut contredire un réglage explicite.
  ⚠️ **Vérifié : `max` est inchangé au bit près** (180 plans), et le plan CANONIQUE des
  trois réglages aussi (60 plans) — donc toujours pas d'`ENGINE_VERSION`.
  ℹ️ **Leçon de test** : le premier cas de gradient comparait `max` et `balanced` sur UN
  profil. Il est tombé avec balanced=91 % et max=88 %. L'ordre des largeurs est une
  propriété de **population**, pas de profil : sur un cas isolé, un panier plus large peut
  retirer la même recette deux seeds de suite. Le test agrège désormais un panel — il
  teste ce qu'on affirme. Et `mesure-variete` accepte `--variete=` pour auditer les trois.

- ~~**A24 · Le plan régénéré était JETÉ au premier réglage touché**~~
  ✅ **CORRIGÉ le 2026-08-02.** Étage suivant d'A21→A23, trouvé sans signalement terrain.
  `app/(tabs)/plan.tsx` remettait le seed à **0** sur toute génération non-reroll — or
  l'auto-refresh de l'écran en déclenche une **dès qu'un réglage entre dans
  `profileSignature`**. Le commentaire d'origine assumait ce choix (« auto-refresh → plan
  canonique ») ; personne n'avait mesuré ce qu'il faisait vivre.
  **Ce que ça donnait** : l'utilisateur régénère jusqu'à une semaine qui lui plaît, puis
  touche un réglage — et la perd. Mesuré sur 4 profils × 4 réglages, en **isolant le
  défaut de l'effet légitime** (comparer « son plan » à « ce qui s'affiche » mélangerait
  les deux : passer vegan DOIT tout changer) :
  | | ce que le réglage change | ce que la remise à zéro détruit EN PLUS |
  |---|---|---|
  | moyenne | 66 % de la semaine | **92 %** |
  Et **2 cas sur 16 retombaient sur le plan canonique EXACT** qu'il venait de rejeter. Le
  pire : ajouter un aliment évité **absent de son plan** — zéro effet légitime — suffisait
  à tout effacer.
  **Correctif** : la règle sort du composant et devient une fonction pure testée,
  `nextPlanSeed(stored, reroll)` (`lib/planEngine.ts`). Le tirage courant se garde ; seul
  un reroll l'avance. Nouvel utilisateur = pas de seed enregistré = 0 = canonique, inchangé.
  ⚠️ **Aucune mesure existante ne pouvait le voir.** `mesure:reroll` compare des rerolls
  entre eux, et le reroll marchait parfaitement — le défaut était dans ce qui arrivait
  APRÈS. C'est pourquoi l'audit `mesure:reglages` regarde la SÉQUENCE vécue, pas l'action.
  ℹ️ **Leçon de test** : le premier test posé était FAUX. Il affirmait « garder le tirage
  éloigne moins du plan de départ que le remettre à zéro » — mesuré, c'est l'inverse sur
  `meal_emphasis` (96 % contre 93 %), parce que ce réglage déplace les cibles et rebat la
  semaine de toute façon. La propriété vraie est plus modeste et se vérifie 240/240 :
  **l'utilisateur n'est pas renvoyé au plan par DÉFAUT.** Poser l'invariant qu'on peut
  tenir, pas celui qui sonne bien.

- ~~**A25 · Le premier plan servi était le MOINS varié des trois**~~
  ✅ **CORRIGÉ le 2026-08-02.** Trouvé en vérifiant qu'A24 ne coûtait rien : un contrôle
  s'améliorait trop franchement, ce qui était l'anomalie. La pénalité de score par
  FAMILLE (`FAMILY_SELECT_W_VARIANT`, A21) ne s'appliquait **que sur un reroll**. Donc le
  plan canonique — celui qu'un nouvel utilisateur reçoit à l'inscription — servait deux
  assiettes du même couple protéine × féculent dans **45,0 %** de ses semaines, contre
  **20,0 %** pour un plan régénéré. Appuyer sur « Régénérer » réparait la première
  impression : exactement l'inverse de ce qu'on veut.
  **Correctif** : `FAMILY_SELECT_W_CANON = 0.03`, la même pénalité en plus doux au seed 0.
  Canonique **45,0 → 23,3 %** ; l'écart avec le régénéré tombe de 25 points à 3,3.
  ⚠️ **Pourquoi 0.03 et pas 0.04 comme sur le reroll.** Balayage au seed 0, panel de
  référence : `0 → 45,0 % · 0.01 → 31,7 % · 0.02 → 23,3 % · 0.03 → 23,3 % · 0.04 → 16,7 %`.
  0.04 descend plus bas mais fait apparaître **1 repas à drapeau sur 1 680** — une
  collation vegan+SG en sèche, hors cible, **sans alternative propre dans la bande**. Le
  canonique est à ZÉRO drapeau ; c'est le tout premier plan servi, et on ne l'ouvre pas à
  un repas hors cible pour 6,6 points de variété.
  ⚠️ **Un garde-fou inerte a été ÉCRIT puis RETIRÉ.** Pour récupérer le 0.04, un plancher
  de qualité a été ajouté au canonique (copie de celui du reroll). Mesuré : il ne change
  **rien** au poids retenu, et ne rattrapait pas non plus le drapeau du 0.04 — ce repas
  n'a aucune alternative propre, c'est le catalogue. Il a donc été supprimé plutôt que
  gardé « au cas où ». **Un garde-fou qui ne garde rien est du bruit, et il ment sur ce
  que le code protège.**
  ⚠️ **Vérifié : le chemin reroll est intact** — 1er repas 51,2 / 78,0 / 82,7 %, semaine
  74,0 / 90,3 / 92,4 %, identiques au dixième. `ENGINE_VERSION` **38 → 39** (le canonique
  change, un plan en cache servirait l'ancienne composition).
  ℹ️ **Ce qui RESTE, et c'est du catalogue.** Par régime, canonique vs régénéré :
  `aucun 8,3/2,8` · `végétarien 0,0/11,1` · `vegan 41,7/30,6` · `vegan+SG 50,0/50,0`.
  En vegan+sans gluten, **le reroll n'aide pas non plus** : il n'y a pas assez de familles
  distinctes. Quatrième mesure indépendante qui pointe D19/B7.
  ℹ️ **Piège d'échantillon rencontré** : le test posé d'abord tirait 2 régimes vegan sur 3
  et sortait 55 % au canonique — rouge à tort. Le panel de référence en compte 2 sur 5.
  **Un échantillon à dominante « cas dur » ne mesure pas la population.**

- ~~**A26 · Régénérer OUBLIAIT ce qui avait déjà été mangé**~~
  ✅ **CORRIGÉ le 2026-08-02.** Troisième étage de la chaîne, trouvé en se demandant
  *« A24 a sauvé le tirage — mais qu'est-ce que la régénération détruit ENCORE ? »*.
  Réponse : tout ce que l'utilisateur avait posé à la main sur son plan. `generate()`
  remplaçait le plan par un `buildLocalPlan` neuf **sans jamais regarder l'ancien**.
  Perdus : repas marqués « mangé », portions réellement consommées (`locked_macros`),
  écarts hors plan (`day_extras`), date de suivi.
  ⚠️ **C'est un défaut de JUSTESSE, pas de confort — le premier de la chaîne.** Mesuré
  sur le panel de référence : **1 448 kcal déjà avalées oubliées en moyenne, 2 130 au
  pire**. Après quoi l'app replanifiait une journée PLEINE par-dessus. Pour quelqu'un en
  sèche, ce n'est pas un affichage qui saute, c'est un conseil faux.
  **Vérifié dans l'app qui tourne**, avant correctif : 2 repas mangés → 0, extra → 0,
  `tracking_date` → null, 1 330 kcal oubliées. Après : les 2 repas survivent **avec
  leurs recettes identiques**, l'extra et la date suivent, et le jour 1 totalise
  2 085 kcal pour une cible de 2 069 — donc aucun double comptage.
  **Correctif** : `carryTracking(profile, ancien, nouveau)` (`lib/planEngine.ts`),
  appelée dans `generate()`. Le report est **asymétrique, et c'est le cœur de la
  décision** :
  - **mangé** → on garde le repas ENTIER de l'ancien plan. Ce qu'il a avalé est un
    FAIT : ni la recette ni les macros ne se re-planifient.
  - **sauté** → seul le statut suit. Le créneau est décidé, mais la recette qu'il
    n'aura pas mangée peut changer avec ses nouveaux réglages.
  - les jours touchés sont recalés, sinon la journée compterait deux fois le déjà-mangé.
  ✅ **Le report vaut AUSSI pour un reroll explicite — ARBITRÉ PAR LE FONDATEUR le
  2026-08-02 (« okok on garde »). Ne pas rouvrir sans qu'il le redemande.**
  « Repartir de zéro » porte sur les repas À VENIR, pas sur l'amnésie de ce matin : un
  petit-déjeuner mangé, aucun bouton ne le défait. Le prix de l'autre lecture a été posé
  avant la décision, sur son propre profil (cible 2 069 kcal) : mangé 1 330 kcal à midi,
  puis « Régénérer » → l'app repartirait sur 2 069 kcal pour la journée, soit **3 399 kcal
  réelles, 1 330 au-dessus de la cible** — le déficit du jour effacé, sans que l'app le
  sache. La péremption reste là où elle doit être : `resetTracking`, au changement de JOUR.
  ℹ️ **CE QUI N'EST PAS REPORTÉ, ET C'EST ASSUMÉ : « Remplacer ce repas ».** Un
  remplacement fait à la main ne survit pas à une régénération — `swapMeal` ne pose
  AUCUN marqueur, un repas remplacé est indistinguable d'un repas proposé. Le préserver
  demanderait d'ajouter un champ au type `Meal`, et c'est discutable : contrairement au
  « mangé », un remplacement n'est pas un fait, et après un changement de cible le plat
  choisi ne rentre peut-être plus. **Arbitré par le fondateur le 2026-08-02 : on laisse
  le comportement et on met un disclaimer.** Livré sous le bouton, dans `RecipeDetail` :
  « Ce remplacement vaut pour ce plan. Si ce plat ne te plaît pas du tout, le 👎 l'écarte
  pour de bon. » — il dit la limite ET donne l'action qui, elle, tient dans le temps (le
  👎 exclut la recette de toutes les générations suivantes). ⚠️ Ne pas rouvrir ça comme
  un bug : c'est une décision, et le trou est étroit puisque le 👎 couvre le vrai besoin.
  ℹ️ **Indice qui traînait dans le code depuis longtemps** : le 👎 est volontairement
  tenu HORS de `profileSignature`, avec le commentaire « ne régénère pas tout ». On
  savait donc qu'une régénération détruisait le travail posé sur le plan — mais on avait
  protégé UN chemin au lieu de traiter la cause. ➡️ **Quand un contournement local existe
  pour éviter un effet de bord, l'effet de bord lui-même reste à traiter** : tous les
  autres chemins y tombent encore.
  ⚠️ **Conséquence assumée du déploiement d'A25** : le bump `ENGINE_VERSION` 38 → 39
  régénère le plan de tout le monde. Livré AVANT ce correctif, il a donc effacé le suivi
  du jour des utilisateurs qui en avaient un. ➡️ **Un bump d'`ENGINE_VERSION` n'est pas
  neutre pour l'utilisateur** : il déclenche l'auto-refresh chez tout le monde en même
  temps. À garder en tête avant d'en poser un.

### 🎯 B — Les deux briques Kyroz+ qui restent

La valeur premium est **construite et déployée** (objectif daté). Plus aucune décision
produit en suspens — il ne reste qu'à coder.

- ~~**B1 · Banque de calories**~~ ✅ **LIVRÉE le 2026-07-30.** « Resto samedi +600 » :
  l'écart est repris sur les autres jours du plan, la SEMAINE garde son total.
  `lib/calorieBank.ts` (pur, 23 tests) + câblage `buildLocalPlan` + éditeur dans le
  Profil. Protéines pleines tous les jours, aucun jour sous le plancher.
  ✅ **MIGRATION JOUÉE** : `supabase/migrations/2026-07-30_profiles_calorie_bank.sql`
  — `calorie_bank` répond `HTTP 200` (revérifié le 2026-08-02). A1 le prouvait déjà
  depuis le 2026-07-31 ; cette ligne était restée à « À JOUER ».
  ⚠️ **Limite mesurée, à connaître** : le plancher journalier de la banque est
  `max(BMR, filet absolu)` et NON le plancher d'énergie disponible — avec ce dernier,
  la marge empruntable était **nulle pour tout profil en déficit** (chez Marc, 82 kg,
  plancher EA 2165 = cible 2165). Justification dans la doc de `bankFloorKcal`. Reste
  que pour un profil dont la cible EST son BMR (Camille, 55 kg : 1285 = 1285), la
  banque ne peut rien emprunter — c'est correct, et l'écran le dit sans alarmer.
  ⚠️ **Elle était NEUTRALISÉE en pratique — corrigé le 2026-07-31.** La banque
  n'était calculée que dans `buildLocalPlan` ; tout le reste lisait la cible PLATE
  et effaçait l'écart déclaré. Deux chemins le déclenchaient sans action volontaire :
  `resetTracking` (premier lancement d'un nouveau jour) et `rebalanceDay` (chaque
  « j'ai mangé » / « sauté »). Mesuré, « mercredi +500 » : après recalage il restait
  **+61 sur 500**, après reset la banque avait disparu. Correctif = source unique
  `bankedTargets` / `dayTargetKcal`, utilisée aussi par l'écran Plan (qui affichait
  le jour « resto » comme un dépassement). 4 tests. **Leçon : une cible du jour ne
  se recalcule pas à deux endroits.**
- **B2 · Paywall — 🤖 L'ÉCRAN ET LE VERROU SONT POSÉS le 2026-08-01. Reste le SDK.**
  Tarif retenu : 4,99 €/mois · 39,99 €/an. **Rien n'est verrouillé aujourd'hui** :
  `PAYWALL_LAUNCH` vaut toujours `null`, donc `premiumAccess` renvoie
  `{ allowed: true, reason: 'not_launched' }` à tout le monde et le code de verrou
  est inerte. Le jour de la mise en vente = **poser une date, et rien d'autre**.

  **Ce qui a été livré :**
  - `app/kyroz-plus.tsx` — écran plein écran, route `/kyroz-plus`. Il sert les
    **4 états** d'`AccessReason`, pas seulement la vente. Angle retenu « sobre » :
    il ressemble à un écran de réglages, pas à une page de vente ; on explique
    avant de demander, le bloc « ce qui reste gratuit » est aussi long que
    l'argumentaire, et il n'y a ni compte à rebours ni « offre limitée ».
  - **Verrou à point d'étranglement UNIQUE** : `openEditor()` dans `profil.tsx`.
    Toutes les ouvertures d'éditeur y passent, **y compris le deep-link
    `@kyroz:openEditor`** — c'est ce qui empêche de contourner le verrou en
    ajoutant une surface. Le piège aurait été de ne garder que les `onPress`.
  - `lib/premium.ts` : `PREMIUM_PRICES`, `annualSavingPct()`, `paywallBanner()`.
    7 tests ajoutés (775 au total). Ils verrouillent ce que l'écran PROMET :
    montants = ceux tarifés chez Apple, économie annoncée **arrondie vers le bas**
    (33 %, jamais 34), et **aucun appel à payer** dans les 3 états non verrouillés.

  **⚠️ Trois choses à savoir avant de continuer :**
  1. **La capture pour la revue Apple doit venir d'un build iOS, PAS du web.**
     Mesuré sur le bundle exporté : Metro remplace `Platform.OS` par `'web'` à la
     compilation, donc le bouton « S'abonner » et « Restaurer mes achats » sont
     **éliminés comme code mort** du build web. C'est correct (le navigateur ne
     peut pas encaisser), mais qui cherche le CTA dans le bundle web conclura à
     tort qu'il manque.
  2. **`PREMIUM_PRICES` est une source PROVISOIRE.** Les montants sont les tarifs
     FRANÇAIS. Au câblage, ils doivent venir du `priceString` du store, qui est
     LOCALISÉ — afficher des euros à qui sera facturé en dollars serait exactement
     le mensonge que la règle interdit. `PREMIUM_PRICES_ARE_LOCAL_FALLBACK` existe
     pour que l'écran puisse le dire, et il le dit.
  3. **Le verrou est d'INTERFACE, pas de moteur — c'est assumé, et ça a un prix.**
     `goal_target` pilote `target_kcal` (`lib/tdee.ts`) et `calorie_bank` déplace
     les calories de la semaine (`planEngine.ts`), tous deux **hors de tout hook
     premium**. Un abonnement expiré laisserait donc un objectif déjà posé
     continuer d'agir. Le corriger ferait bouger le plan sous les yeux de la
     personne (`calorie_bank` est dans `profileSignature` → plan périmé +
     régénération) : à trancher le jour où un abonnement peut réellement expirer,
     pas avant.

  ✅ **LE SDK EST CÂBLÉ le 2026-08-02 — et il est DORMANT.** `react-native-purchases`
  v10.6.0 installé, `lib/purchases.ts` écrit, `useEntitlement()` branché,
  achat + restauration + prix localisés reliés à l'écran. **Rien ne change pour
  personne aujourd'hui** : sans clé, `purchasesConfigured()` est faux, le SDK n'est
  même pas chargé, et `PAYWALL_LAUNCH` reste `null`.

  **Deux interrupteurs INDÉPENDANTS, et c'est volontaire** : la **clé** allume le
  paiement, la **date** allume le verrou. On peut donc tester un achat en TestFlight
  sans verrouiller un seul compte en production.

  🔬 **CE QUE LA VÉRIFICATION A TROUVÉ, et c'est le vrai apport du chantier.**
  `lib/purchases.ts` charge le SDK en `require` PARESSEUX, donc il n'est jamais
  exécuté sur web. Mesuré sur le bundle exporté : **il y était quand même**, 4
  occurrences de `purchaseStoreProduct` / `RNPurchases`, et le bundle web passait de
  **3 509 492 à 4,4 Mo (+900 Ko)**. Metro analyse les `require` STATIQUEMENT — un
  `require` paresseux retarde l'exécution, il ne retire rien du bundle. C'est
  EXACTEMENT le piège de `lib/generatePlan.ts` (un SDK jamais appelé, servi à chaque
  visiteur, −224 Ko à sa suppression) ; la leçon n'avait pas été généralisée.
  ➡️ Corrigé par une séparation de plateforme : **`lib/purchases.web.ts`** est un
  bouchon sans une ligne de code de paiement, que Metro résout avant `purchases.ts`
  sur web. Re-mesuré : **3 510 945 octets, soit +1 453 octets (+1,4 Ko)** sur le
  bundle web, et **0 occurrence** de RevenueCat. Le coût réel du chantier sur le
  produit déployé est donc le poids du bouchon.

  🧰 **Autre chose laissée derrière** : `test/reactNativeMock.ts` + l'alias
  `react-native` dans `vitest.config.ts`. Vitest ne sait pas parser la source de
  `react-native` (annotée Flow), ce qui rendait **intestable** tout fichier de `lib/`
  qui l'importe — c'est pour ça que `exportData.ts` et `notifications.ts` n'ont
  aucun test. `purchases.ts` décide qui paie : il ne pouvait pas rester dehors.
  ⚠️ Le mock met `Platform.OS` à **`ios`** et pas `web`, exprès : sur `web`
  `purchasesConfigured()` est faux quoi qu'il arrive, donc le test de dormance ne
  prouverait plus rien. **Un test qui ne peut pas échouer ne protège rien.**

  ✅ **Vérifié** : 907 tests verts (+9), `tsc` propre, bundle web reconstruit, et
  l'écran relu dans le navigateur en état `locked` — prix de repli affichés AVEC la
  mention « ce sont les tarifs français », chemin web sans bouton d'achat, 0 erreur
  console. *(État forcé par une date de lancement temporaire, remise à `null` après.)*

  🔴 **L'ABONNEMENT ÉTAIT COLLÉ À L'APPAREIL, PAS AU COMPTE — corrigé le 2026-08-02**
  (`identifyUser`, `applyIdentity`, `hooks/usePremium.ts`). Le câblage de la veille
  appelait `Purchases.configure({ apiKey })` **sans identifiant** : RevenueCat créait
  donc un utilisateur ANONYME, propre au téléphone, et `useEntitlement()` ne relisait
  jamais rien (`useEffect(…, [])`). Deux dégâts symétriques, tous deux silencieux :
  | | ce qui se passait | pourquoi |
  |---|---|---|
  | téléphone partagé | la personne suivante héritait de l'abonnement | rien ne retirait le droit à la déconnexion |
  | deux appareils | l'abonné payant restait `locked` sur le second | l'identité anonyme ne franchit pas l'appareil |
  ➡️ L'ancre est l'**UUID Supabase** — celui qui porte déjà `created_at`, donc le
  grand-père. Jamais l'e-mail : cet identifiant part chez RevenueCat.
  ⚠️ **Le sens de l'erreur est CHOISI** : un `logIn` en échec (réseau) rend `false`, il
  ne retombe jamais sur l'état de l'identité précédente. Se tromper en refusant coûte
  une feature à un abonné hors ligne le temps d'un nouvel essai ; se tromper en donnant
  sert l'abonnement de quelqu'un d'autre. Le premier se répare, pas le second.
  ⚠️ **`isEntitled()` a été SUPPRIMÉE** (et son bouchon web) : elle lisait
  `getCustomerInfo()` sans jamais dire au SDK de qui il s'agissait. La garder aurait
  laissé deux façons de demander « cette personne a-t-elle payé ? », dont une aveugle
  au compte — le double chemin que `CLAUDE.md` §10 interdit.
  ✅ **Vérifié** : 931 tests verts (+6), `tsc` propre. Les 6 tests portent sur
  `applyIdentity`, la règle **isolée du SDK** — vitest ne peut pas charger un module
  natif, donc sans cette extraction le chemin qui décide qui a payé n'aurait aucun
  test. Contrôle de morsure fait : mécanisme cassé exprès → **3 tests rouges**.
  Bundle web re-mesuré : **3 511 182 octets** (+237 sur la mesure de la veille) et
  **0 occurrence** de RevenueCat — le `.web.ts` tient.
  ⚠️ **Ce que le code ne peut PAS prouver** : le comportement réel du SDK (aliasing
  anonyme → identifié, transfert d'un reçu d'un compte à l'autre) ne s'observe qu'en
  bac à sable. C'est l'étape 5 ci-dessous, et elle doit maintenant vérifier **trois**
  choses au lieu de deux (`STORE-RELEASE.md` §1-bis).

  🧑 **CE QUI RESTE, ET QUI DEMANDE TES COMPTES — dans cet ordre :**
  1. ✅ **App Store Connect — FAIT le 2026-07-30** (commit `3a78fdc`) : Bundle ID,
     fiche, Paid Applications Agreement actif, groupe Kyroz+ et les deux abonnements
     créés et tarifés. Les deux produits sont en **« Métadonnées manquantes »**.
     ⚠️ **Cette fiche affirmait que cet état « n'empêche ni RevenueCat ni le bac à
     sable ». La moitié seulement est établie** (corrigé le 2026-08-02) :
     • **RevenueCat : CONFIRMÉ**, et pas déduit — une fois la clé App Store Connect API
       posée, le dashboard résout les deux identifiants et affiche l'état renvoyé par
       Apple (`MISSING_METADATA`). **C'est la preuve, par Apple lui-même, que
       `kyroz_plus_monthly` et `kyroz_plus_yearly` existent bien chez lui** — la seule
       vérification des identifiants qui ne demandait pas un build.
     • **Bac à sable : JAMAIS VÉRIFIÉ.** Apple ne sert normalement un produit à StoreKit
       qu'à partir de « Prêt à soumettre ». Si c'est le cas, `getProducts()` rendrait une
       liste vide, l'achat afficherait « indisponible », et on imputerait au code un
       problème de fiche produit.
     ➡️ **Compléter les métadonnées AVANT le test sandbox** — nom d'affichage et
     description localisés FR sur chaque abonnement, ce qui se fait dès maintenant. Seule
     la **capture de review** dépend réellement du paywall, donc du build.
     🧰 **Laissé au passage : la clé App Store Connect API est posée dans RevenueCat**
     (rôle App Manager + Issuer ID + Vendor number). Elle ne sert pas à l'app, elle sert
     à ce que le dashboard puisse INTERROGER Apple au lieu d'afficher « Could not check ».
     Sur quatre identifiants faux dans ce chantier, c'est le seul instrument qui tranche
     sans build.
  2. ✅ **RevenueCat — CONFIGURÉ le 2026-08-02 par le fondateur, et VÉRIFIÉ.** Projet
     « Kyroz », app App Store rattachée (`app.kyroz.mobile`), entitlement **`premium`**
     contenant **`kyroz_plus_monthly`** et **`kyroz_plus_yearly`**, tous deux sous l'app
     Apple. Recoupé avec le code : `ENTITLEMENT_ID` (`lib/purchases.ts` + le bouchon web)
     et les deux `storeProductId` (`lib/premium.ts`) correspondent au caractère près, et
     deux tests les verrouillent.

     🔴 **UN QUATRIÈME IDENTIFIANT FAUX, attrapé AVANT le build.** L'onboarding
     RevenueCat propose des noms tout faits (« Kyroz Pro », « Kyroz Premium »…) et avait
     créé l'entitlement sous l'identifiant **`Kyroz Premium`** — avec une majuscule et
     un ESPACE, dans une chaîne qui voyage en URL. Le code demandant `premium`, l'achat
     aurait abouti et l'abonné serait resté `locked`, **sans message**. Corrigé côté
     dashboard (et pas côté code) pour trois raisons : l'espace est illégitime dans une
     clé, le renommage est gratuit tant qu'aucun abonné n'existe, et un identifiant
     GÉNÉRIQUE laisse le nom commercial libre de changer sans toucher au code.
     ➡️ **Le compteur est à quatre** (`kyroz_plus_annual`, `kyroz_plus`, celui-ci, plus
     l'entitlement des faux produits) : ces chaînes se recopient d'un bout à l'autre,
     elles ne se choisissent nulle part.

     ⚠️ **Piège de l'onboarding, à connaître** : RevenueCat crée d'office un « Test
     Store » avec deux faux produits (`monthly`, `yearly`) et les attache à l'entitlement.
     Ils ne correspondent à RIEN chez Apple. Détachés. La clé `test_…` servie pendant
     l'onboarding n'est pas non plus la bonne — celle du build commence par `appl_`.

     ⚠️ **L'offering n'a PAS été créé, et c'est correct** : le code adresse les produits
     par identifiant (`getProducts([...])`, `purchaseStoreProduct`) et ne lit jamais les
     offerings. RevenueCat les recommande ; ici c'est une couche de plus à maintenir pour
     zéro bénéfice. À rouvrir seulement si un jour on veut changer l'offre à distance.

     ✅ **Clé publique confirmée le 2026-08-03** : `appl_xBxmQspWhyarHqyIZeQgBpUBLlF`
     (Project settings → API keys), posée dans EAS et **retrouvée dans le bundle exporté**.
  3. ✅ **CLÉ POSÉE le 2026-08-03** — `EXPO_PUBLIC_REVENUECAT_IOS_KEY` en variable
     d'environnement EAS sur `production` (`npx eas-cli env:create`, `--visibility
     plaintext` : le préfixe `EXPO_PUBLIC_` inline la valeur en clair dans le binaire
     de toute façon, la marquer secrète ne protégerait rien).
     ✅ **Et VÉRIFIÉE dans le bundle, pas seulement dans le dashboard** :
     `npx eas-cli env:exec production 'npx expo export --platform ios'` puis `strings`
     sur le bytecode Hermes → la clé y est (1 occurrence), `RNPurchases` aussi.
     Rien n'a été publié : c'est un export local, la simulation exacte de ce que
     `eas update` enverrait.
     ⚠️ **Pas la clé secrète du dashboard** — elle ne doit jamais entrer dans un
     bundle client. Inutile de la poser sur le build web : il n'encaisse pas.
     ⏸️ **La clé RevenueCat n'est que sur `production`** — mesuré : `eas env:list preview`
     ne rend que les deux clés Supabase. Un build `preview`/`device` n'encaisse donc pas.
     C'est volontaire tant que le seul chemin testé est TestFlight, mais à savoir avant de
     conclure « le SDK ne marche pas » sur un build interne.
     `_ANDROID_KEY` : sans objet tant qu'il n'y a pas d'app Android.

     🔴 **CE QUE CETTE VÉRIFICATION A TROUVÉ — un OTA POUVAIT briquer l'app en silence.**
     *(Diagnostic du 2026-08-03 au matin. **Corrigé le jour même** — le paragraphe est
     conservé au passé parce que le mécanisme, lui, resservira.)*
     `eas env:list production` ne contenait que **deux** variables : la clé RevenueCat
     et `EXPO_PUBLIC_REVIEW_CODE`. **Les clés Supabase n'y étaient PAS** — elles vivaient
     dans le bloc `env` de chaque profil de `eas.json`, que **`eas build` lit et que
     `eas update` NE LIT PAS**.
     ➡️ Conséquence : un `eas update` lancé depuis un clone frais, un CI, ou toute
     machine sans `.env.local` aurait publié un bundle **sans URL Supabase**. L'app ne
     démarre pas sans, et la mise à jour atteint tous les testeurs en quelques minutes,
     **sans revue de store pour l'arrêter**.
     ⚠️ **La première mesure ne prouvait rien** : elle avait été faite depuis le worktree,
     qui a `.env.local`. Le bundle contenait donc les clés — mais grâce au fichier local,
     pas grâce à EAS. **Une mesure qui ne distingue pas les deux sources ne mesure pas la
     question posée.**

     ✅ **CORRIGÉ le 2026-08-03, et mesuré des deux côtés.** Protocole : écarter
     `.env.local`, exporter le bundle iOS via `eas env:exec production`, `strings -a` sur
     le `.hbc`. Avant : `rgdjsdnqlmfkourrhijv` **0**, `sb_publishable_` **0**, clé
     RevenueCat **1** — le brique était réel, pas théorique, et c'est ce contraste avec la
     clé RevenueCat (déjà côté EAS) qui a désigné le coupable. Après : **1 / 1 / 1**.
     `EXPO_PUBLIC_SUPABASE_URL` et `_ANON_KEY` sont désormais des variables EAS sur
     `production`, `preview` **et** `development` ; `eas.json` ne porte plus **aucune**
     clé et chaque profil DÉCLARE son environnement. **Aucune exposition nouvelle** : ces
     deux valeurs étaient déjà en clair dans `eas.json`, versionné, et sont publiques par
     conception (c'est la RLS qui protège, pas le secret de la clé).
     🎁 Effet de bord gagné : le profil `development` n'avait **aucun** bloc `env` — un
     build dev-client partait donc sans Supabase. Il les a maintenant.
     🔒 Garde-fou : `lib/__tests__/easEnv.test.ts` (3 tests, contrôle de morsure fait —
     réintroduire une clé dans `eas.json` ou retirer un `environment` fait rougir, avec le
     nom du profil fautif dans le message).

     🔴 **LE PIÈGE DANS LE PIÈGE — le cache de Metro ne s'invalide PAS sur un changement
     de valeur d'`EXPO_PUBLIC_*`.** Une fois les variables posées, le ré-export a **encore**
     rendu 0 occurrence. La configuration était juste, le bundler resservait une
     transformation figée. Seul `--clear` a produit le bon artefact.
     ➡️ **`eas update --clear-cache`**, sans exception. Et vider le cache avant toute
     mesure : ici, c'est la MESURE qui mentait, et elle a menti dans le sens alarmant —
     elle aurait tout aussi bien pu mentir dans le sens rassurant.

     ⚠️ **Deuxième piège : quand une clé est dans les deux endroits, `eas.json` GAGNE**
     (eas-cli, `evaluateConfigWithEnvVarsAsync` : `{ ...serverEnvVars, ...buildProfile.env }`).
     Faire tourner une clé côté serveur seulement aurait laissé les builds servir
     l'ancienne — le même brique, réintroduit par la porte d'à côté. EAS l'écrivait dans
     sa sortie (« The values from the build profile configuration will be used ») ; encore
     fallait-il la lire. C'est ce qui a décidé de supprimer le doublon plutôt que de le
     garder « au cas où ».

     🧰 **`eas config --profile <p> --platform ios` est l'instrument à connaître** : il
     imprime l'environnement résolu, les variables serveur chargées, celles d'`eas.json`
     et l'avertissement de doublon — **sans lancer de build, donc gratuitement**. Les
     quatre profils ont été vérifiés un par un, avant et après.
  4. **Un nouveau build natif ET une nouvelle revue store.** `react-native-purchases`
     est un module NATIF : l'OTA ne peut pas le livrer (`CLAUDE.md` §2). Le
     `ios/` local doit être régénéré (`npx expo prebuild` puis `pod install`) — il
     n'est pas versionné.
     ⚠️ **Cette étape ne peut PAS passer avant la 2 et la 3** : un binaire construit
     sans les clés ne peut rien encaisser, et le bac à sable (étape 5) n'aurait rien
     à tester. Bâtir avant, c'est brûler une revue store pour rien.
     ✅ **Préparé le 2026-08-02 — `npx expo-doctor` a trouvé une vraie dette de
     build** : `expo-font`, requis par `@expo/vector-icons`, n'était **pas déclaré en
     dépendance directe** ni enregistré comme config plugin. Il était présent en
     transitif — donc le web n'a jamais bronché — mais expo-doctor l'annonce comme
     un risque de plantage **hors Expo Go**, c'est-à-dire exactement dans le binaire
     qu'on s'apprête à envoyer en revue. Ajouté (`package.json` + `app.json`), zéro
     nouveau paquet dans le lock, 931 tests verts, `tsc` propre, web relu (icônes
     comprises) sans erreur console.
     ⚠️ **Reste 9 paquets en retard de version** (`expo` 56.0.12 vs ~56.0.18,
     `react-native-screens` 4.25.2 vs ~4.26.0, 7 correctifs). `npx expo install --fix`
     **a échoué** sur un cache npm cassé (`EACCES` / `EEXIST` dans `~/.npm/_cacache`,
     probablement deux `npm` concurrents). L'état a été remis d'aplomb à la main —
     `package.json` et le lock sont cohérents avec ce qui est réellement installé.
     ➡️ À reprendre avant le build : `npm cache verify` puis `npx expo install --fix`.
     Ce n'est pas bloquant aujourd'hui, mais EAS le signalera.
  5. **Tester un achat en bac à sable** (compte sandbox Apple) — et y prouver les
     **trois** choses que seul le bac à sable peut prouver : l'achat débloque, la
     **restauration** fonctionne (sans elle, rejet Apple 3.1.1), et l'abonnement
     **suit le compte** (se déconnecter retire le droit, se reconnecter ailleurs le
     rend).

     🔴 **CETTE FICHE DÉCRIVAIT UN ORDRE IMPOSSIBLE — corrigé le 2026-08-03.** Elle
     disait « puis seulement après : poser une date dans `PAYWALL_LAUNCH` ». On ne
     peut pas : **tout le bloc d'achat de `app/kyroz-plus.tsx` n'est rendu que si
     `reason === 'locked'`** (ligne `{enVente && (`), et `locked` exige une date. Sans
     date, il n'y a ni bouton d'achat, ni bouton de restauration, ni écran à
     photographier. **Les trois choses à prouver, plus la capture qu'Apple réclame,
     dépendent toutes du même interrupteur** — celui que la fiche plaçait en dernier.
     ⚠️ **Et une date ne suffit pas** : `isGrandfathered` rend `true` pour tout compte
     ANTÉRIEUR, donc le compte du fondateur ne verrait rien non plus. Il faut un
     **compte créé APRÈS la date**.
     ➡️ **Ordre réel** : poser la clé → poser une date → OTA → créer un compte neuf →
     le paywall apparaît → capture + achat en bac à sable.
     ⚠️ Le bac à sable pourrait quand même refuser tant que les produits sont en
     « Métadonnées manquantes » (cf. étape 1) — et c'est la capture, prise à ce
     moment-là, qui les en sort. La boucle se dénoue par la date, pas par l'achat.
     ⚠️ La date ne se recule JAMAIS. En revanche la **repousser** est sans danger :
     ça déverrouille des comptes, ça n'en verrouille aucun. Une date de test peut donc
     être remplacée plus tard par la vraie date de mise en vente.
  6. 🧾 **RGPD — ✅ LA MOITIÉ « DÉCLARER » EST FAITE le 2026-08-02.** Rattacher l'UUID
     Supabase fait de RevenueCat un **sous-traitant**, et deux phrases de la politique
     de confidentialité devenaient fausses le jour du premier abonné : §5 promettait
     « aucun tiers », §7 promettait un effacement total. Réécrites **au conditionnel**
     (« si vous souscrivez… ») pour rester vraies aujourd'hui, où rien n'est vendu.
     Ajouté aussi : une section **CGU « 3. Abonnement Kyroz+ »** — renouvellement
     automatique + délai de 24 h et remboursements du ressort du store (les deux
     contrôlés par la revue Apple, Guideline 3.1.2), et le piège qui coûte de l'argent
     réel : **supprimer son compte Kyroz n'annule pas l'abonnement**. Date de mise à
     jour passée au 2 août 2026.
     🧰 **Laissé derrière : `lib/__tests__/legal.test.ts`.** Le texte vit en DEUX
     exemplaires (`constants/legal.ts` pour l'écran, `public/legal.html` pour l'URL
     publique exigée par les stores) et se recopie À LA MAIN. L'en-tête le disait
     depuis toujours, rien ne l'attrapait. Le test exige que le miroir contienne
     chaque paragraphe. Contrôle de morsure fait : un paragraphe retiré du HTML → rouge.
     🔴 **REVENUECAT ÉTAIT NOMMÉ DANS LE TEXTE PUBLIC — RETIRÉ le 2026-08-02, sur
     signalement du fondateur : « je n'ai même pas de compte ».** Il avait raison, et
     la faute est la MIENNE : j'ai traité comme acquis ce que les docs du dépôt
     traitaient comme acquis depuis le 2026-07-27 (`CLAUDE.md` §1 : « via RevenueCat »),
     alors qu'aucun contrat n'existe et que le choix n'est pas définitivement arrêté.
     ➡️ **Désigner un sous-traitant qui n'en est pas un est le même mensonge que taire
     celui qui l'est** — juste dans l'autre sens. Le texte parle désormais d'« un
     prestataire spécialisé », ce que le RGPD autorise explicitement (art. 13-1-e :
     « les destinataires **ou les catégories** de destinataires »), et promet de le
     nommer avant toute mise en vente.
     🧰 Verrouillé DANS LES DEUX SENS par `legal.test.ts` : un test exige qu'un
     prestataire soit annoncé, l'autre qu'**aucun nom** n'apparaisse tant qu'aucun
     contrat n'existe.
     ⚠️ **CE QUI MANQUE ENCORE, et c'est volontaire** : le cadre du transfert hors UE
     (clauses contractuelles types / DPF), que le RGPD art. 13-1-f exige. Il ne se lit
     que dans le contrat. À écrire EN MÊME TEMPS que le nom, le jour de la signature.
     ✅ Autre phrase datée, repérée au passage : « aucun outil d'analyse tiers n'est
     utilisé » — RETIRÉE le 2026-08-18, PostHog est nommé au §5. Elle n'a pas attendu la
     pose de la clé : l'app demandait déjà le consentement en production.
     ⏭️ **Non fait, et assumé** : appeler l'API d'effacement de RevenueCat depuis
     `delete-account`. Elle demande leur clé SECRÈTE, donc du code serveur, et ne sert
     à rien tant qu'il n'y a aucun abonné. Le RGPD impose de DIRE ce qu'on conserve,
     pas de tout supprimer partout. Détail : `MONETISATION.md` §C.

  ⚠️ **Un point que la revue Apple refuse et qui n'est PAS encore fait** : le bouton
  « Restaurer mes achats » est branché, mais il ne peut être PROUVÉ qu'avec un compte
  sandbox. Sans restauration fonctionnelle, rejet au titre de la Guideline 3.1.1.

  🔴 **DEUX IDENTIFIANTS ÉTAIENT FAUX DANS LE CODE — corrigés le 2026-08-02, et c'est
  la vraie trouvaille de la vérification.** Les deux échouaient de la même façon : en
  SILENCE, ce que `STORE-RELEASE.md` appelle lui-même « la source d'erreur n°1 ».
  | | le code disait | la réalité | établi par |
  |---|---|---|---|
  | produit annuel | `kyroz_plus_annual` | **`kyroz_plus_yearly`** | créé chez Apple le 2026-07-30 (`STORE-RELEASE.md` §4, `MONETISATION.md` §A) |
  | entitlement | `kyroz_plus` | **`premium`** | prescrit par `STORE-RELEASE.md` §6 et `MONETISATION.md` §A/§C |
  Les deux mauvaises valeurs ont été **inventées par le code du paywall le 2026-08-01**,
  APRÈS que les produits aient existé — et un test verrouillait la première, donc
  protégeait le bug. Effet si on les avait laissées : `getProducts()` ne trouve rien,
  l'achat rend « indisponible », le prix reste au tarif de repli, et l'entitlement
  n'est jamais vu — donc un abonné payant resterait `locked`.
  ➡️ **Règle** : ces chaînes se RECOPIENT depuis le dashboard, elles ne se choisissent
  pas dans le code. Si le dashboard dit autre chose, c'est lui qui a raison.

  🟠 **UN ÉCART DE PRODUIT, NON TRAITÉ (décision fondateur requise).** Apple porte
  **TROIS** formules depuis le 2026-07-30 — mensuel 4,99 € · annuel payé au mois
  3,99 €/mois avec engagement 12 mois · annuel payé d'avance 39,99 €. Le paywall n'en
  affiche que **DEUX**, et `STORE-RELEASE.md` §4 dit noir sur blanc « le paywall devra
  donc présenter trois formules, pas deux ». Ce n'est pas un bug de câblage : c'est un
  choix de présentation commerciale (l'engagement 12 mois se vend mal, et la règle
  produit interdit de mettre la pression). ➡️ À trancher avant la mise en vente.

### 📱 C — Sortie stores

- ~~**C1 · 🤖 Build iPad**~~ ✅ **LES TROIS ÉTAPES SONT FAITES le 2026-08-01.**
  `ios.supportsTablet` est passé à **`true`**, dans le bon ordre : le layout d'abord,
  les captures ensuite, la bascule en dernier.

  **Ce qu'il y avait à corriger, mesuré sur le rendu web à 1024 pt (iPad 13" portrait)
  AVANT de coder** : il n'y avait pas « des écrans à ajuster », il n'y avait **aucune
  contrainte de largeur nulle part** — une seule occurrence de `maxWidth` dans tout le
  code, sur une modale. Le pire cas est précisément l'écran que le fondateur voulait
  servir (« cuisiner avec la recette sous les yeux ») : la ligne « Œuf entier … 3 œufs »
  séparait le nom de sa quantité de **plus de 900 pt**. Le bouton « J'ai cuisiné » faisait
  1 200 px pour deux mots ; la liste de recettes montrait 8 recettes là où la place en
  permettait 16.

  **Source unique** : `lib/layout.ts` (seuils purs, testés) + `constants/layout.ts`
  (le hook `useLayout()`). Seuil **`TABLET_MIN_WIDTH = 700`** — au-dessus du plus large
  iPhone (440) et au-dessus d'un **Split View à 50 % sur iPad 11" (507)**, qui doit
  continuer à recevoir la mise en page téléphone.

  | | largeur max | pourquoi ce nombre |
  |---|---|---|
  | Écrans | **620** | ~70 caractères de texte courant — haut de la fourchette lisible (45–75). À 680 : 79. En pleine largeur : 130 |
  | Feuilles (`Sheet`, `ActionSheet`) | **820** | pour que les deux colonnes de l'écran recette fassent 370 pt, soit **plus large que la zone utile d'un iPhone** (345) |
  | Grille recettes | **980** | deux cartes de ~460 pt, la largeur d'une carte de téléphone |

  **Le seul écran qui a une mise en page à lui : la recette.** Ingrédients | préparation
  côte à côte sur tablette — c'est le cas d'usage énoncé, et côte à côte on lit une
  quantité sans remonter l'étape en cours. Tout le reste est une colonne centrée.

  ⚠️ **Une piste écartée en cours de route, par la mesure.** J'avais donné plus de place
  à la préparation (flex 1,15 contre 1) : la colonne ingrédients tombait à **316 pt**,
  soit **plus serré que sur un iPhone** (345 pt utiles) pour l'ingrédient le plus long du
  catalogue (« Lentilles cuites (conserve ou sachet) », 37 caractères). Colonnes remises
  à égalité et feuille élargie de 760 à 820. Le critère est verrouillé par un test :
  *aucune colonne ne doit être plus étroite que sur téléphone*.

  ⚠️ **Le piège d'alignement à connaître** : la colonne se pose sur un CONTENEUR quand
  l'élément s'aligne par `marginHorizontal` — une marge s'ajoute à l'EXTÉRIEUR du
  `maxWidth`. La barre de progression de l'écran Courses dépassait des cartes de 40 pt.
  Un seul élément du code était dans ce cas ; le reste utilise `padding`.

  **Trois `Dimensions.get('window')` corrigés au passage** (`Sheet`, `GuidedTour`,
  `WeightCheckin`) : sur iPad la fenêtre change de taille **sans relancer l'app**
  (rotation, Split View), et une valeur lue au chargement du module reste fausse jusqu'au
  redémarrage. `WeightCheckin` calculait la largeur de sa courbe sur l'ÉCRAN (1024) alors
  qu'elle vit dans une feuille bornée à 820 : la courbe débordait de son cadre.

  **Vérifié à l'écran, écran par écran, à 1024×1300 ET à 390×844** : Plan · Courses ·
  Frigo · Recettes (grille 2 colonnes : **18 recettes visibles contre 8**) · Recette
  (2 colonnes) · Profil et son éditeur en feuille · Login · Onboarding · portail de
  dépistage · Kyroz+. **Le rendu téléphone est inchangé** — `centered()` renvoie un objet
  VIDE sous le seuil, et un test l'exige (un style « inoffensif » suffirait à faire
  diverger l'existant). 802 tests verts, `tsc` propre.

  **Captures iPad livrées** : `npm run store:assets:ipad` → `test/store-ipad/`,
  **2048×2732**, le gabarit exact qu'Apple exige. Le script prend un gabarit tablette,
  et n'y produit plus le feature graphic (visuel Google Play, cf. C2).

  ✅ **VÉRIFIÉ EN NATIF le 2026-08-02, sur le simulateur iPad Pro 13"** — pas seulement
  dans un navigateur. Build `xcodebuild` + install `simctl` (⚠️ `expo run:ios` échoue :
  son détecteur d'appareils classe le simulateur en appareil PHYSIQUE et réclame un
  certificat ; et CocoaPods casse si `LANG` n'est pas en UTF-8). Parcours réel :
  login → dépistage → onboarding → plan → grille recettes (2 colonnes, 16 visibles) →
  écran recette (2 colonnes, « Œuf entier … 3 œufs » à ~370 pt au lieu de 950).
  **Rien de cassé.**

  🔴 **CE QUE LA MESURE A CORRIGÉ, et c'est une affirmation FAUSSE que j'avais écrite
  partout : LE PAYSAGE EST OUVERT SUR IPAD.** `orientation: portrait` d'`app.json` ne vaut
  que pour l'iPhone. Le **manifeste réellement généré** dit :
  `UISupportedInterfaceOrientations~ipad` = les **quatre** orientations · `UIRequiresFullScreen`
  = `false`. Expo le fait exprès (le multitâche iPadOS l'impose) et Apple a retiré
  l'échappatoire `UIRequiresFullScreen` : **ce n'est pas refermable, et Apple testera en
  paysage.** Vérifié à 1366×1024 : colonne centrée, grille à 2 colonnes, rien ne déborde.
  ➡️ **Même piège qu'A2** (`android.permissions: []` ne prouvait rien) : lire le manifeste
  généré, jamais la config source. Deux fois le même piège, deux plateformes différentes.

  ⚠️ **Une imprécision MESURÉE et ASSUMÉE, pour qu'on ne la redécouvre pas** : la barre
  d'onglets code en dur `height: 88, paddingBottom: 28` sur iOS (`app/(tabs)/_layout.tsx`),
  valeurs taillées pour l'encoche d'un iPhone (34 pt). Mesurée au pixel sur la capture
  iPad : la barre fait bien 88 pt, alors que la zone sûre d'un iPad en demande 20 →
  **8 pt d'espace mort**. Ce n'est ni cassé ni un motif de rejet, et le corriger
  proprement (via `useSafeAreaInsets()`) **déplacerait aussi l'iPhone**. Laissé tel quel
  délibérément : 8 pt ne valent pas une régression sur la plateforme principale.

  ℹ️ **Piste non prise, si un jour tu veux mieux remplir le paysage** : à 1366 pt, la
  grille de recettes garde 2 colonnes et laisse 193 pt de marge de chaque côté. Une 3ᵉ
  colonne au-delà de ~1200 pt est un seul chiffre dans `gridColumns()`. Pas fait : hors du
  périmètre demandé, et Apple ne l'exige pas.
- **C2 · Comptes et visuels — ✅ LARGEMENT FAIT le 2026-07-30.**
  Apple (compte + contrat de vente actif + fiche + 2 abonnements tarifés) · Google Play
  (compte payé, site validé, fiche créée) · **visuels générés** (`npm run store:assets` :
  5 captures + feature graphic)
  ⚠️ **CORRIGÉ le 2026-08-01 — « aux specs » était FAUX, et sur les deux chiffres.**
  Les captures faisaient **1170×2532** (390×844 en ×3), pas 1424×2532. *(Et ce 1170×2532
  était lui-même hors specs — un 6.1" qu'App Store Connect refuse : `PHONE` est passé à
  `430×932` le **2026-08-10**, sortie mesurée **1290×2796**. Donc **deux** rectifications
  successives sur le même chiffre, chacune se croyant finale — cf. STORE-RELEASE §7.)*
  Surtout, le feature
  graphic sortait à **3072×1500** et non 1024×500 : sa page était créée dans le contexte
  des captures, donc elle héritait de son `deviceScaleFactor: 3`. Google exige
  EXACTEMENT 1024×500 — le visuel livré aurait été refusé. Il a désormais son propre
  contexte en ×1, et la sortie est vérifiée à 1024×500.
  Le nombre de recettes affiché dessus était figé à **« 314 recettes »** pour un
  catalogue qui en compte 466 ; il est maintenant lu dans `recettes-kyroz.json`, donc
  il ne peut plus prendre du retard sur une vague. · **2 builds Android**
  (`versionCode` 2 puis 3 ; **prendre le 3**, le 2 est antérieur au correctif de
  permissions). Restent, côté fondateur :
  - ✅ **Build iOS — FAIT, et cette ligne annonçait le contraire.** Constaté le
    2026-08-03 en interrogeant EAS (`eas build:list`), pas en relisant la doc :
    **iOS `production` 1.0.0 (3) FINISHED**, envoyé et traité par Apple, plus cinq
    builds `device` (ad hoc). Le commit bâti, `cd4e2d3`, **contient tout le travail du
    2026-08-02** — vérifié par ancêtre git, pas supposé : rattachement de l'abonnement
    au compte, `expo-font`, texte légal.
    ⚠️ **Ce build n'a PAS la clé RevenueCat** (elle a été posée après) → dans TestFlight
    aujourd'hui, `purchasesConfigured()` est faux. C'est ce que l'OTA doit corriger.
    ✅ **Vérifié SUR LE BINAIRE, pas sur la config** (2026-08-03) : l'IPA soumis a été
    téléchargé (27 Mo, `artifacts.applicationArchiveUrl`), dézippé, et son
    `Payload/Kyroz.app/main.jsbundle` mesuré au `strings -a`. Résultat :
    `rgdjsdnqlmfkourrhijv` **1**, `sb_publishable_` **1**, `RNPurchases` **2**,
    `appl_xBxm` **0**. Le build a donc bien Supabase (via l'ancien bloc `env`
    d'`eas.json`) et pas la clé RevenueCat — cohérent avec sa date de création
    (03/08 01h39, postérieure au build du 02/08 22h35).
    ✅ **ET LE RELECTEUR APPLE PEUT SE CONNECTER — question posée, puis tranchée.**
    Les profils de `eas.json` ne déclaraient aucun `environment` ; on pouvait craindre
    que `eas build` n'aille pas chercher `EXPO_PUBLIC_REVIEW_CODE`, qui ne vit QUE côté
    serveur — le relecteur aurait alors été bloqué au login, motif de refus.
    Trois faits l'écartent : eas-cli DÉDUIT l'environnement (`distribution: store` →
    production, source `evaluateConfigWithEnvVarsAsync`) ; la variable est en visibilité
    *Sensitive*, donc chargée (`byAppIdWithSensitiveAsync` prend Plain text **et**
    Sensitive) ; et `eas env:list --format long` la date au **17 juillet**, bien avant
    le build. `eas config --profile production` le confirme en une commande.
    ⚠️ **Chercher le NOM de la variable dans le bundle ne prouve rien** : `strings` rend
    0 pour `EXPO_PUBLIC_REVIEW_CODE` comme pour `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, alors
    que l'une est posée et l'autre pas. Babel retire le nom dans les deux cas. Ce sont
    les VALEURS qui se cherchent, jamais les noms.
    ✅ **Revue bêta APPROUVÉE le 2026-08-03** (soumise à 00h58).

    🔴 **CE PARAGRAPHE AFFIRMAIT « désormais ACQUISE : les builds suivants et les
    nouveaux testeurs sont distribués sans repasser par Apple » — ET L'OBSERVATION LE
    CONTREDIT.** Le 2026-08-11 au soir, le fondateur constate que le build (6) est
    disponible pour lui (groupe **interne**) mais **pas pour les testeurs externes**.
    ⚠️ **Rien n'est tranché ici, et c'est volontaire** : trois causes donnent le même
    symptôme, et seul l'écran d'App Store Connect les distingue — (1) le build n'a pas
    été **ajouté au groupe externe** (geste manuel : TestFlight → groupe → Builds → +) ;
    (2) il est **« En attente d'examen »**, donc une revue bêta tourne (~24 h) ;
    (3) **« Examen refusé »**, et il y a un motif à lire.
    ➡️ **Relever le statut affiché à côté du build AVANT de réécrire cette phrase.**
    Une affirmation confortable jamais re-mesurée est exactement ce qui a fait présenter
    la DSA comme bloquante pendant douze jours alors qu'elle était validée le 30 juillet.
    ℹ️ **Et ça ne bloque pas la sortie** : testeurs externes et revue App Store sont deux
    circuits séparés. Détail de la procédure, des identifiants et des deux groupes
    de testeurs : **`TESTFLIGHT.md`**.
    ⚡ iOS n'a PAS la règle des 12 testeurs → c'est le chemin le plus rapide pour être
    en ligne.

    🔴 **NE PAS POSER `PAYWALL_LAUNCH` PENDANT UNE REVUE BÊTA.** Le relecteur Apple se
    connecte via le compte sentinelle `review@kyroz.app` (`lib/reviewAccess.ts`), donc
    un compte créé **au moment où il teste** — donc POSTÉRIEUR à la date. Il ne serait
    pas grand-péré : il tomberait sur le paywall, avec des produits encore en
    « Métadonnées manquantes », donc un bouton d'achat qui répond « indisponible ».
    Motif de refus, et provoqué par nous. ➡️ Attendre que la revue soit acquise — elle
    l'est ensuite pour de bon, builds et testeurs suivants n'y repassent pas.
  - 🧑 **Recruter 12 testeurs Android** + créer le Google Groupe. C'est le chemin
    critique côté Google : les 14 jours ne démarrent qu'une fois les testeurs inscrits.
  - 🧑 **Compléter la fiche Play** (textes §3, formulaire Sécurité des données §4) —
    Google refuse de publier, **même en test fermé**, tant qu'elle est incomplète.
  - 🤖 **Abonnements Google** : `kyroz_plus` + forfaits `monthly` / `annual`. Le menu
    Monétisation ne s'ouvre qu'après dépôt d'un build.
- ~~**C4 · Décision : mises à jour OTA (`expo-updates`) ?**~~ ✅ **INSTALLÉ le
  2026-08-01, sur « go » du fondateur.** `eas.json` déclarait trois canaux depuis des
  semaines alors que le paquet n'était pas installé — ils étaient **inertes**. Il
  manquait trois choses, pas une : le paquet, le bloc `updates` d'`app.json`, et
  `runtimeVersion`.

  **Config** : `runtimeVersion.policy = "appVersion"` · `checkAutomatically: "ON_LOAD"` ·
  **`fallbackToCacheTimeout: 0`**. Ce dernier point est le seul qui touche l'expérience :
  l'app **ne bloque jamais au démarrage** pour attendre une mise à jour — elle part sur
  le bundle en cache, télécharge en fond, applique au lancement suivant. Sans lui, la
  contrainte « latence < 1 seconde » de `CLAUDE.md` §4 sautait à la première connexion
  lente.

  **Vérifié sur le manifeste Android RÉELLEMENT généré** (`expo prebuild`, la seule
  preuve qui vaille — cf. A2) : `EXPO_UPDATES_LAUNCH_WAIT_MS = 0` ·
  `EXPO_UPDATES_CHECK_ON_LAUNCH = ALWAYS` · `EXPO_RUNTIME_VERSION = 1.0.0` ·
  `EXPO_UPDATE_URL` pointant sur le projet EAS. **Aucune permission ajoutée**, et le
  correctif A2 survit (`RECORD_AUDIO` et `SYSTEM_ALERT_WINDOW` toujours en
  `tools:node="remove"`). Export web inchangé, 787 tests verts, `tsc` propre.

  🧑 **Publier un correctif** : `npx eas-cli update --branch production --message "…"`.

  ⚠️ **Ce que l'OTA ne peut PAS faire** : livrer du natif. Ajouter ou changer une
  dépendance native impose un nouveau build ET une nouvelle revue de store.
  `runtimeVersion` est le garde-fou : lié à `expo.version`, **monter la version coupe
  volontairement la ligne OTA** vers les anciens binaires, pour qu'un bundle JS ne
  atterrisse jamais sur un natif incompatible.

  ⚠️ **Le risque, à connaître AVANT de s'en servir** : une mise à jour OTA atteint tout
  le monde en quelques minutes, **sans revue de store pour l'arrêter**. Le filet
  disparaît. Ne jamais publier sans `npm test` + `tsc` verts ; en cas de casse,
  republier l'update précédent (`eas update:rollback`).

- ~~**C6 · Publier l'OTA des créneaux de repas libres**~~ ❌ **ENTRÉE OUVERTE À TORT le
  2026-08-08, refermée dans la foulée. Il n'y avait rien à faire.** La **6ᵉ OTA**
  (`0d045fe`, commit `9bac59a`, 12 commits) portait déjà « repas paramétrables » ; le
  natif avait la feature avant que la tâche ne soit écrite.
  ⚠️ **Le défaut de méthode vaut d'être gardé** : j'ai déduit l'écart de la CHRONOLOGIE
  (« mon merge est du 7, la dernière OTA que je connais est du 7 ») au lieu de comparer
  les commits. Une session parallèle avait publié entre-temps. Le contrôle tient en une
  ligne et coûte deux secondes :
  ```bash
  git merge-base --is-ancestor <mon-commit> <commit-de-la-derniere-OTA>
  ```
  ➡️ **Un écart web/natif s'établit en comparant des COMMITS, jamais des dates** — et
  d'autant moins quand plusieurs sessions poussent le même jour. Cette entrée reste ici
  comme trace ; ne pas la rouvrir.

- **C7 · Checklist légale — ce qui RESTE (2026-08-11)**
  La checklist a été arbitrée contre le code (fiche **E39**) : A1, A2, A3 et le volet
  registre sont clos, **et A4 l'est depuis E40**. Ce qui suit est le reliquat, et il
  n'entre PAS dans une liste à part — c'est ici que vivent les tâches.
  🔴 **PLUS AUCUN POINT CODABLE : tout ce qui reste est administratif ou côté Google.**
  - ~~🤖 **A4 · Page « Méthodologie & sources »**~~ ✅ **LIVRÉE le 2026-08-11 (E40)** —
    route `/methodologie`, Profil → roue dentée → Aide et retours, et l'essentiel repris
    dans les notes de soumission (`STORE-RELEASE.md` §11). **Aucun chiffre n'y est
    écrit** : `lib/methodologie.ts` les LIT dans le moteur, et deux tests l'exigent —
    dont celui qui a fallu ajouter après mutation, parce que retirer du texte les
    valeurs venues des constantes ne distingue pas une interpolation d'un littéral de
    même valeur.
    ⚠️ *Cette ligne a annoncé « le seul chantier codable qui reste » pendant l'heure qui
    a séparé les deux PR. Elle est barrée plutôt que supprimée : c'est la trace que le
    dernier point app de la checklist est tombé, et l'entrée entière peut maintenant se
    lire comme « il ne reste rien à coder ».*
  - 🧑 **B1 · Compte Google Play en « Organisation » (numéro D-U-N-S)** — les health
    apps l'exigent. **Le seul point à délai EXTERNE de toute la liste** (D-U-N-S gratuit
    auprès de Dun & Bradstreet, de quelques jours à plusieurs semaines). ➡️ À lancer en
    premier, en parallèle de tout le reste : si le compte a été créé en « individuel »,
    c'est lui qui fixera la date de sortie Android, pas le code.
  - 🧑 **B1-bis · Formulaire « Health apps declaration »** (Play Console → App content)
    + disclaimer « Kyroz n'est pas un dispositif médical » dans le **1er paragraphe** de
    la description de la fiche.
  - 🧑 **B3 · Mentions légales LCEN sur `kyroz.app`** (nom, SIREN, adresse, contact,
    hébergeur). ⚠️ **Dépôt SÉPARÉ `kyroz-site`**, pas dans cet arbre — les valeurs se
    reprennent de `constants/legal.ts::LEGAL`, source unique.
  - 🧑 **C1 · Médiateur de la consommation** (L.612-1), **avant la première vente
    Kyroz+**. ~50–200 €/an. ⚠️ Les CGU (§10) citent déjà « un médiateur » de façon
    GÉNÉRIQUE : la loi demande de nommer celui auquel on a adhéré, avec ses
    coordonnées. ➡️ C'est donc une ligne à COMPLÉTER dans `constants/legal.ts` **et**
    son miroir `public/legal.html` le jour de l'adhésion, pas une ligne à créer.
  - 🧑 **C2 · Dépôt de marque INPI** (~190 €) — clearance faite (classes 9 et 44), dépôt
    non fait. Avant de pousser la communication.
  - 🧑 **C3-bis · RC professionnelle** — non obligatoire, recommandée. Quelques centaines
    d'euros par an.
  - 🧑 **DPA Resend** — voir `RGPD-REGISTRE.md`, suivi des actions. Deux lignes du
    registre en dépendent et restent volontairement EN SUSPENS.
  - 🧑 **E · Consultation avocat (300–600 €)** — trois zones grises, dans l'ordre de coût
    si la lecture est fausse : (1) périmètre **HDS** — a priori hors champ (pas de
    parcours de soins, aucun professionnel de santé impliqué), et c'est le point le plus
    cher si c'est faux ; (2) statut art. 9 de données traitées 100 % en local sans
    persistance ; (3) relecture CGU + politique. ⏳ **Une AIPD légère** quand le volume
    décollera (données sensibles + grande échelle).
  ⚠️ **Plus rien de tout ceci ne bloque un build ni la soumission iOS** — A4 était le
  seul à devoir y être, et il est sur `main`. Le reste est administratif ou côté Google.
  ➡️ **Le chemin critique redevient le BUILD**, et il en faut un NOUVEAU : les builds
  (4) et (5) du 2026-08-11 sont antérieurs aux merges de #96 et #97, donc **E39 et E40
  ne sont dans aucun binaire** (cf. la case « Sortie stores » du tableau de tête).
  🔴 *Cette ligne a annoncé pendant deux heures que le build embarquerait « cinq
  chantiers, E36 à E40 ». **Faux sur trois** : E36, E37 et E38 étaient déjà dans les
  binaires (4) et (5), lancés le matin même par une autre session. Écrite en déduisant
  de MES merges au lieu d'interroger EAS — exactement le défaut consigné pour l'écart
  web/natif : **on compare des COMMITS, jamais des chronologies**, et d'autant moins
  quand plusieurs sessions poussent le même jour.*

- **C3 · 🧑 Classement d'âge : ADULTES UNIQUEMENT** — *tranché le 2026-07-30.*
  Apple 17+ · Google « Adultes uniquement », pour coller au blocage 18 ans de l'app.
  Répondre au questionnaire de façon à **atteindre** ce classement (le thème « gestion du
  poids » seul donne 12+). Coût accepté : moins de visibilité. Détail : `STORE-RELEASE.md` §6.

### 🍽 D — Catalogue

- **D23 · 🤖 La vague « petits formats vegan / vegan+SG » — et elle part en OTA, PAS
  dans le binaire.** *Décision fondateur du 2026-08-09.*
  ⚠️ *Numéro pris sur une branche, donc une RÉSERVATION que personne d'autre ne voit :
  le vérifier contre `main` et les branches en aval au moment de fusionner. Quatre
  collisions en une journée le 2026-08-08 (E19/E20, A28/A29, A29/A30, E16/E23).*

  **La cible, mesurée le 2026-08-07** : les **25 drapeaux bloquants** sur les repas
  servis (6 720 mesurés). Tous sur deux gabarits — **F 55 et F 65 en sèche** —, tous en
  **vegan ou vegan+SG**, et tous les **JOURS DE REPOS** : les journées à 1 328 / 1 498
  kcal, où le catalogue n'a ni dîner ni collation assez petits. Ce n'est pas un défaut de
  sélection, c'est une limite de VIVIER que la répartition par volume a rendue visible.
  ➡️ Donc des **dîners et des collations en petit format**, pas une vague large.
  ⚠️ **Re-mesurer avant de commander** (`npm run mesure:variete`, `mesure:vivier`) : ces
  chiffres datent du 2026-08-07 et cette table entière se périme dès qu'un chantier touche
  les cibles. Et mesurer le vivier AVANT d'écrire, pas après — c'est la leçon de B7→B9.

  🔴 **POURQUOI L'OTA, ET CE N'EST PAS UN REPORT.** Une vague catalogue est du **JS pur** —
  pas une ligne de natif —, donc `expo-updates` sait la livrer en entier. La mettre dans le
  binaire de la soumission coûterait un à deux jours de décalage pour un bénéfice que
  **personne ne peut constater** : 30 recettes de plus dans un catalogue de 512 ne se voient
  ni à la revue, ni sur une capture d'écran. ➡️ On soumet avec le catalogue actuel, la vague
  part dès la revue passée.
  ⚠️ **Ce raisonnement ne se généralise PAS à tout ce qui est du JS.** Il tient parce que le
  changement est invisible au relecteur. `PAYWALL_LAUNCH` est du JS lui aussi, et poser sa
  date pendant la revue mettrait un écran de vente en travers du test du relecteur (il crée
  son compte pendant l'essai, donc après la date, donc non grand-péré). Le critère est
  « est-ce que ça change ce que le relecteur VOIT ? », pas « est-ce que c'est du JS ? ».
  ⚠️ Et une OTA atteint tout le monde en minutes **sans revue pour l'arrêter** : elle ne part
  jamais sans `npm test` + `tsc` verts, et elle se publie **depuis `main`**, jamais depuis la
  branche qu'on vient de merger (cf. la ligne « OTA publiées » de la photo).

- ~~**D1 · Commande de rédaction : collations légères**~~ ✅ **LIVRÉ le 2026-08-01 —
  13 collations (`col67`→`col79`), catalogue 314 → 327.** Le trou était réel et pire
  qu'annoncé : sur 66 collations, **aucune** ne descendait sous 180 kcal (la plus légère
  à 192), là où l'entrée disait « une seule sous 130 ». La plus légère du catalogue est
  désormais à **156 kcal**.
  📈 **Effet mesuré en A/B sur le MÊME code** (catalogue ramené à 314 puis remis à 327,
  pour ne pas confondre avec l'effet du merge de A7) — collations servables par profil :

  | profil | avant | après | |
  |---|---|---|---|
  | F 65 sèche | 27/66 | **39/79** | +12 |
  | H 80 sèche | 35/66 | **46/79** | +11 |
  | F 80 sèche | 29/66 | **37/79** | +8 |
  | H 70 maintien | 25/66 | **33/79** | +8 |
  | F 65 maintien | 28/66 | 35/79 | +7 |
  | F 55 sèche | 23/66 | 28/79 | +5 |
  | F 60 maintien | 27/66 | 32/79 | +5 |
  | H 65 sèche | 31/66 | 36/79 | +5 |
  | F 70 masse | 13/66 | 16/79 | +3 |
  | H 80 maintien | 24/66 | 27/79 | +3 |
  | H 95 masse | 21/66 | 23/79 | +2 |
  | **H 110 masse** | 16/66 | 16/79 | **+0** |

  **Tous les profils gagnent sauf `H 110 masse`** — le seul que `check:enveloppe`
  signale comme non couvert par l'union du lot. Son besoin dépasse le plafond de
  l'enveloppe « standard » (290 kcal). À traiter dans un lot suivant, pas en forçant
  une enveloppe.

  ⚠️ **CE QUE JE N'AI PAS FAIT, ET POURQUOI.** `b2.md` §3 demande « au moins 2 des
  9 petits formats à 115 kcal · 4 g de protéines », en assumant qu'elles ne serviront
  qu'un profil. **Impossible : `check:enveloppe` REJETTE toute recette servant moins de
  3 profils sur 12.** La commande et le contrôle se contredisent. J'ai suivi le
  contrôle — c'est lui qui garde le catalogue vendable — donc aucune recette n'est
  sous 156 kcal en base. **Si le fondateur veut vraiment des recettes ultra-légères
  mono-profil, c'est le seuil R8 qu'il faut assouplir, pas la commande qu'il faut
  réécrire.**
  ♻️ **La consigne fautive est retirée du générateur le 2026-08-01**, avec la raison en
  commentaire : tant que R8 refuse une recette servant moins de 3 profils sur 12, aucun
  lot futur ne doit la redemander. C'est une décision 🧑 en attente, pas un oubli.

  🧰 **Méthode, pour le prochain lot** : compositions écrites à la main, **quantités
  résolues numériquement** contre les vraies valeurs `/100 g` d'`ingredients_reference`.
  Trois pièges rencontrés, tous invisibles à la lecture :
  1. viser le CENTRE des fourchettes fait échouer R8 — la servabilité dépend de la
     **protéine**, il faut viser le HAUT de sa fourchette (4 recettes servaient 0 à 2
     profils avant correction) ;
  2. un solveur produit des grammages absurdes en cuisine (5 g de sarrasin pour une
     galette, 1 g de noix) — imposer des minimums plausibles ;
  3. changer un ingrédient sans relire les instructions viole le §6.3 (une recette
     citait encore « le pain » après passage à la polenta).
- ~~**D2 · Vérifier le lot B2**~~ ✅ **GÉNÉRÉ ET VÉRIFIÉ le 2026-08-01, en session.**
  `check:doublons` → aucune violation (R1, R2, R4, R5, R7) · `check:enveloppe` → lot
  conforme · 12 ancres protéiques distinctes (max 2 par ref, le brief en demandait 6
  et plafonnait à 3) · 7 ancres grasses · 11 des 13 sans gluten. Drop conservé dans
  `Recette/drops/2026-08-01-b2-collations/`.

  ✅ **LES QUATRE CONTRADICTIONS DE `b2.md` SONT CORRIGÉES le 2026-08-01 — à la SOURCE.**
  `Recette/lots/` est **généré** (`npm run gen:lots`) et le README interdit de l'éditer à
  la main : corriger les fichiers n'aurait tenu que jusqu'à la régénération suivante. Tout
  est donc passé dans `scripts/gen-brief-lot.ts`. Ce qu'elles étaient, et ce qui les tue :

  1. **§7 recommandait des ancres absentes du §4.** `couplesOuverts()` et la liste
     « refs jamais employés » se servaient dans les **123 refs du catalogue** au lieu des
     refs autorisés par le §4 du lot. Sur `b3`, **12 des 18 « ancres encore ouvertes »**
     (poulet, bœuf, porc, cabillaud, thon, sardines, crevettes, mozzarella…) étaient
     inemployables : le §7 envoyait dans le mur que le §4 venait de construire. Les deux
     fonctions prennent désormais les refs autorisés en paramètre — obligatoire, pas
     optionnel.
     ➡️ **Effet de bord révélateur** : une fois restreint au §4, le tableau se remplissait
     d'`amandes`, `flocons_avoine`, `chocolat_noir` — le critère « ≥ 7 g de protéines
     aux 100 » laisse passer tout ce qui est dense. Ces intrus étaient noyés sous les
     viandes, pas absents. `estAncreProteique()` ajoute deux conditions : la protéine
     doit peser **≥ 25 % des calories** du ref, et un plafond absolu ≤ 40 g disqualifie
     (la levure maltée, plafonnée à 20 g, porte 10 g de protéines au maximum).
  2. **La répartition par régime du §1 était infaisable.** b2 demandait 7 recettes
     carnées avec **une seule** ancre carnée au §4 (`dinde_escalope`), plafonnée à 3.
     Livré à la place : 7 vegan, 5 végétariennes, 1 carnée. *(Effet de bord utile :
     +7 collations vegan, ça sert aussi D7.)* Deux causes, deux correctifs :
     - les trois lignes du tableau **se recouvraient** (« sans restriction (viande,
       volaille, poisson, œufs, produits laitiers) » vs « végétariennes (œufs et
       laitages permis) ») : impossible de partitionner. Elles sont désormais
       **exclusives** et le §1 nomme les ancres carnées réellement disponibles ;
     - `verifieCoherence()` calcule le plafond (nb d'ancres carnées × 25 % du lot) et
       **refuse de générer** au-delà.
     ➡️ **`b3` portait la même erreur, par recopie** : `libre: 11`, la répartition des
     repas complets appliquée au petit-déj. Le §4 des repas complets expose 13 ancres
     carnées, celui du petit-déj en expose **3**. 11 tenait sous le plafond (3 × 5)
     mais le saturait à 73 %. Ramené à **6** — mesuré, le créneau petit-déj compte
     4 recettes carnées sur 78 (5 %), donc 6 fait un vrai gain sur le salé (que le §3
     réclame) sans forcer. Nouvelle répartition `b3` : 6 carnées · 7 végé · 7 vegan.
  3. **§5 imposait `wave: "2026-07-30-vague-113"`** alors que `Recette/README.md` exige le
     **nom du dossier du drop**. `wave` est maintenant un champ du lot, imprimé au §5, dans
     l'exemple JSON **et** dans l'auto-contrôle du §9 — une seule source, plus de
     divergence possible.
  4. **§3 citait `yaourt_nature` et `petit_suisse`**, deux refs qui n'existent nulle part.
     `verifieCoherence()` extrait tout `ref` entre backticks des consignes et échoue s'il
     n'est pas au §4 (une courte liste de termes techniques — `fat`, `scalable`… — est
     exclue ; l'élargir sans raison rouvrirait le trou).

  🔒 **Vérifié en remettant la commande d'origine de b2** : le générateur sort en code 1 et
  n'écrit rien, en listant les 3 défauts + la collision d'ids. Et sur les 5 briefs produits,
  contrôle indépendant fait **sur les fichiers** (pas sur le générateur) : zéro `ref` cité
  hors du §4 du même fichier, `wave` identique au §5 et dans l'exemple.

  🗑 **`b2.md` est SUPPRIMÉ.** Le lot est livré et mergé : un brief qui commande `col67`–`col79`
  est une commande impossible à honorer. Sa définition reste dans le générateur (marquée
  `livre`), sa matière première dans `drops/2026-08-01-b2-collations/`. Le contrôle d'ids
  attrape désormais ce cas tout seul.
- ~~**D3 · 🧑 Axe allergène**~~ ✅ **TRANCHÉ ET CORRIGÉ le 2026-08-02 — PAS d'axe allergène,
  et le chemin existant réparé.** La fiche demandait : « le `tahini` introduit le sésame et
  aucun champ ne le porte — ajoute-t-on un axe allergène ou reste-t-on sur la saisie
  libre ? ». La mesure a répondu autre chose.

  🔴 **La prémisse visait le mauvais endroit.** `tahini` s'appelle **« Purée de sésame
  (tahini) »** : écrire `sésame` dans « aliments à éviter » l'attrapait déjà, 1 ref sur 1.
  **Le cas qui a ouvert la tâche était le seul qui fonctionnait.**

  🔴 **Le vrai défaut : le filtre échouait EN SILENCE.** `recipeAllowed` comparait le mot
  écrit à une sous-chaîne des noms d'ingrédients, sans normalisation ni synonyme :

  | l'utilisateur écrit | refs attrapés | recettes qui restaient servies |
  |---|---|---|
  | `poisson` | **0 / 7** | 66 |
  | `arachide` | **0 / 1** | 29 |
  | `fruits à coque` | **0 / 5** | 96 |
  | `oeuf` sans ligature | **0 / 2** | 53 |
  | `lactose` | **0 / 10** | 130 |
  | `soja` | 7 / 12 | tofu, tempeh, edamame passaient |

  Le champ **proposait lui-même « arachide, crustacés… » en exemple** — les deux mots qui
  n'attrapaient rien. Rien à l'écran ne le disait.

  🔴 **Et il attrapait TROP, dans l'autre sens** : `bœuf` contient `œuf`. Éviter les œufs
  retirait **23 des 24 plats de bœuf**, en silence aussi. Le correctif ancre la
  correspondance en DÉBUT DE MOT — mesuré après : `œuf` → 53 (les vrais porteurs), `bœuf`
  → 24, et les pluriels continuent de marcher (`lentille` → 11, `pâtes` = `pates` → 27).

  ✅ **Ce qui a été livré** : `lib/avoidance.ts` (normalisation ligatures/accents + table
  `FOOD_FAMILIES` mot → refs), branché dans `planEngine.recipeAllowed` **et** dans
  `dislike.recipeHasKeyword` — les deux divergeaient, or ce qu'on PROPOSE d'éviter doit
  être exactement ce qui SERA évité. Vérifié de bout en bout : sur 1 344 repas servis par
  mot, **0 repas fautif** et **0 drapeau bloquant** (les pools restent viables).
  L'écran affiche désormais ce qu'il fait — « arachide » écarte 29 recettes · « zzzz » →
  « aucun ingrédient ne correspond » — et marque les mots déjà enregistrés restés sans
  effet. Vérifié dans le navigateur.

  🚫 **POURQUOI PAS D'AXE ALLERGÈNE FORMEL** (décision à confirmer par le fondateur, elle
  est réversible) : une colonne + migration Supabase + question d'onboarding, pour
  afficher « sans arachide » — c'est-à-dire une **promesse de sécurité** qu'un catalogue
  générique ne peut pas tenir (traces, contamination croisée, composition réelle du
  falafel prêt à consommer, du pesto, de la chapelure). `CLAUDE.md` §6 bloque déjà les
  pathologies et Kyroz n'est pas un dispositif médical. Le champ reste une **préférence**,
  et le vocabulaire de l'écran doit le rester. ➡️ Si tu veux l'axe formel malgré tout,
  c'est un chantier à rouvrir explicitement — le socle (`FOOD_FAMILIES`) est déjà là.
  ⚠️ Allergènes absents du catalogue, donc sans objet aujourd'hui : céleri, moutarde,
  sulfites, lupin, mollusques.
- ~~**D4 · 🤖 Les groupes R4 saturés**~~ 🚫 **FERMÉ le 2026-08-02 — la tâche mesurait le
  mauvais objet, et son remède aurait raté le premier coupable. Ne pas la rouvrir sous
  cette forme.** Le défaut de variété est RÉEL et il est traité, mais dans le MOTEUR :
  voir **D18**. Ce qui suit reste vrai comme photo du catalogue, pas comme consigne.
  🔴 **Pourquoi la fiche était fausse.** Elle demandait de faire tomber un compteur de
  groupes « au-delà de 2 recettes par couple ». Mesuré sur 240 semaines réellement
  générées, les couples effectivement servis en quasi-doublon sont d'abord des groupes de
  **DEUX** — `edamame × maïs` en collation, 48 semaines, le pire du catalogue et
  parfaitement légal au regard de R4. Six des dix pires sont des groupes de 2. Réécrire
  pour ramener 14 groupes à 0 n'aurait pas touché le premier responsable, et aurait fait
  réécrire `rep71` (12/12) et `rep130` (11/12) pour satisfaire un compteur.
  ➡️ **Le seuil « > 2 » de R4 reste utile pour le catalogue** (il empêche d'écrire six
  fois le même plat) ; il n'a jamais été une mesure de ce que l'utilisateur reçoit.

- **D4-bis · la photo du catalogue au 2026-08-02 — 14 groupes saturés.**
  Un couple (protéines × féculent) est « saturé » au-delà de 2 recettes. Les 14 groupes,
  par taille (`npm run check:doublons` les réaffiche) :

  | recettes | créneau | couple |
  |---|---|---|
  | 8 | collation | `yaourt_soja_proteine` × **aucun féculent** |
  | 6 | petit-déj | `whey` × `flocons_avoine` |
  | 6 | petit-déj | `yaourt_soja_proteine` × **aucun féculent** |
  | 5 | collation | `proteine_vegetale` × **aucun féculent** |
  | 5 | repas complet | `poulet_filet` × `riz_basmati` |
  | 4 | petit-déj | `skyr` × `flocons_avoine` |
  | 3 | petit-déj | `fromage_blanc_0` × `flocons_avoine` · `proteine_vegetale` × ∅ · `yaourt_soja_proteine` × `quinoa` |
  | 3 | collation | `whey` × ∅ · `whey` × `flocons_avoine` |
  | 3 | repas complet | `poulet_filet` × `patate_douce` · `tempeh` × `riz_complet` · `boeuf_bavette` × `nouilles_riz` |

  ⚠️ **Le motif dominant est « ∅ » — une recette SANS féculent déclaré** (19 recettes sur
  les 4 plus gros groupes). Ce n'est pas qu'un compteur : sur le créneau collation, une
  recette sans `carb` ne peut pas s'étirer, et c'est l'une des quatre causes mesurées en
  **D15**. ➡️ Toute nouvelle collation doit porter un vrai `carb`.
  ➡️ À régler **en écrivant ailleurs**, jamais en réécrivant une recette au hasard : le
  générateur de briefs (`scripts/gen-brief-lot.ts`) publie déjà les couples saturés et les
  ancres encore ouvertes dans chaque §7.
- **D19 · 🤖 B7 — l'audit R8 du petit-déj et du repas complet. ✅ LIVRÉ le 2026-08-03** —
  30 recettes végétales, catalogue 466 → 496. Chiffres et leçons dans la fiche B7 du
  §« Chantiers ouverts ». Ce qui suit est le diagnostic d'origine, conservé parce qu'il
  explique les choix.
  ⚠️ **Neuvième occurrence du piège de mesure, et la plus contre-intuitive** : ajouter
  12 petits-déjeuners a fait passer la collation de **3 à 5 recettes sous le seuil** et sa
  moyenne de 7,38 à 7,09, **sans qu'aucune collation soit touchée**. Les cibles de l'audit
  sont reconstruites depuis des plans générés : changer les recettes du matin change les
  plans, donc les cibles du soir. ➡️ Ne jamais lire une variation de créneau comme un effet
  de ce qu'on vient d'écrire dans CE créneau.
  Trouvé en mesurant D4 : l'audit que D15 avait mené sur les collations n'avait **jamais**
  été fait sur les deux autres créneaux.

  ✅ **La question laissée ouverte ici — « combien de repas SERVIS viennent de ces
  recettes-là ? » — est répondue** (`npm run mesure:vivier`, 2026-08-02) : les 114 recettes
  sous le seuil fournissent **935 des 10 752 repas servis, soit 8,7 %** (12 profils ×
  8 régimes × 4 semaines). Ce n'est donc ni un compteur inerte (le piège de D5 et D7,
  ouvertes sur des chiffres qui ne coûtaient rien) ni une urgence : environ un repas sur
  onze. La commande B7 est calibrée là-dessus — 30 recettes, pas 114.

  | créneau | recettes | moyenne | sous le seuil 8/12 | à ZÉRO profil |
  |---|---|---|---|---|
  | petit-déj | 110 | 8,27/12 | **37 (34 %)** | 4 |
  | repas complet | 270 | 8,51/12 | **74 (27 %)** | 4 |
  | collation *(déjà traité, seuil 3/12)* | 86 | 7,38/12 | 3 | 0 |

  ⚠️ **Ces chiffres ont bougé TROIS fois pendant qu'on les écrivait** — sixième, septième
  puis huitième occurrence du piège de mesure. Avant D18 : repas complets **70**, collation à
  **7,62/12**. Après D18 : **71** et **7,50**. Après A21/A23 : **74** et **7,41**, la
  collation passant de 1 à 3 sous le seuil. Après A25 : **8,27 / 8,51 / 7,38**. Les quatre
  sont des correctifs du MOTEUR qui n'ont touché AUCUNE recette. ➡️ `npm run mesure:seuils`
  avant de commander quoi que ce soit, et ne pas lire une variation de ces lignes comme un
  effet catalogue.

  🔎 **La cause première est la même qu'en D15, et elle est chiffrée** : une recette **sans
  `carb`** ne peut pas s'étirer. Petit-déj — 13 recettes sans féculent, moyenne **2,69/12**,
  **13 sur 13 sous le seuil**, contre **9,02/12** pour les 97 qui en portent un. Repas complet —
  6 recettes, moyenne **1,50/12**, 6 sur 6 sous le seuil, contre **8,67/12** pour les 264 autres.
  Les pires : `pd04` `pd11` `pd37` `pd64` et `rep18` `rep51` `rep137` `rep144` à **0/12**.
  ℹ️ Ce contraste est **la** justification du chantier, et pourtant aucune commande ne
  l'imprimait — il a été ajouté à `mesure:seuils` le 2026-08-02 (colonne « avec `carb` »).
  Un chiffre qui porte une décision doit être re-mesurable, sinon il vieillit en silence.

  ♻️ **Le remède a changé à la commande, et il faut dire pourquoi.** La fiche prescrivait
  « **réécrire, pas ajouter** » (convention B5) sur les 114 recettes sous le seuil. Ce qui
  a été commandé le 2026-08-02 est un **AJOUT de 30 recettes**. Deux mesures ont retourné
  le raisonnement, et l'une a démenti ce que j'allais écrire :
  1. **Ces recettes médiocres sont servies EN PRIORITÉ aux gabarits extrêmes**, pas aux
     profils moyens comme je l'avais supposé : `H 110 masse` **15,4 %** de ses repas et
     `H 95 masse` 13,3 %, contre **3,5 %** pour `F 65 sèche`. Le mécanisme est mécanique —
     ces profils ont le vivier le plus mince, donc le moteur va chercher au fond du panier
     faute d'alternative. ➡️ **Leur donner des alternatives suffit** : le moteur préférera
     de lui-même la recette qui colle. Réécrire n'était pas nécessaire pour ça.
  2. **Les 8 recettes à 0/12 ne sont servies AUCUNE fois** sur 10 752 repas (`pd04` `pd11`
     `pd37` `pd64` · `rep18` `rep51` `rep137` `rep144`). Leur réécriture ne changerait
     donc **rien pour personne aujourd'hui** : c'est de l'hygiène de catalogue, pas un
     correctif de service. ⚠️ C'est exactement le piège de D5 et D7 — un compteur alarmant
     qui ne coûte rien — et la ligne « 4 recettes par créneau ne servent AUCUN profil »
     était en train de le retendre. Elles ne sont PAS dans B7, et c'est délibéré.

  ✅ **LES 8 SONT CORRIGÉES le 2026-08-05 (décision fondateur).** Elles passent de 0/12 à
  **11 · 9 · 7 · 10 · 12 · 10** (`pd04 pd11 rep18 rep51 rep137 rep144`) ; `pd37` et `pd64`
  l'ont été au passage par P3.4 (0→7 et 0→12). Plus aucune recette à 0/12, sur aucun créneau.

  🔎 **Le diagnostic de cette fiche était juste pour quatre d'entre elles, et FAUX pour
  rep137 — et c'est la plus instructive.** Toutes tombaient en `under_target_kcal` sur les
  12 cibles : la recette atteint sa protéine, puis plafonne. La fiche accusait « l'absence
  de féculent ». Mais **le moteur vise les glucides en GRAMMES, pas en calories** : une
  fois la cible glucides servie, grossir le riz ne comble plus rien. `rep137` avait déjà
  son riz ; son plafond venait de ses **4 g d'huile d'olive**, soit 36 kcal de marge.
  Passée à 12 g : **0 → 12/12**, sans toucher au reste.
  ➡️ **Un plafond calorique ne se lit pas sur l'ingrédient qui MANQUE, il se lit sur celui
  qui peut encore GROSSIR une fois les cibles en grammes servies.**

  ⚠️ Chaque quantité est le sommet d'un BALAYAGE mesuré, pas une estimation. Et pour
  `rep18`, six féculents ont été essayés : seule la pomme de terre la remonte à 7/12
  (quinoa, riz complet, boulgour, pâtes, châtaigne et maïs plafonnent tous à **3/12**) —
  d'où la hausse assumée de R2 de 70 à 71, journalisée dans `doublons.test.ts`.
  ➡️ Reste vrai : le manque n'est pas réparti, il est concentré dans des **cellules
  régime × gabarit** précises (cf. `mesure:vivier`), et une cellule vide se remplit en
  écrivant dedans.
  ⚠️ **Re-mesurer avant de commander** : le vivier servable n'est pas stable d'une vague à
  l'autre (cf. le piège de mesure du §📍), donc ne pas partir de ces 37/74 comme d'un acquis.

  🎯 **CE QUI SE VOIT DANS LE SERVICE, LUI, EST MAINTENANT MESURÉ — et ça oriente le lot.**
  Quatre mesures indépendantes, prises pour d'autres raisons, désignent le même endroit :
  **le végétal, aux créneaux petit-déj et collation.**
  1. *(A23)* Un **petit-déjeuner vegan à forte cible protéique n'a qu'UNE recette
     servable.** Régénérer ne change jamais ce repas — et c'est correct : servir autre
     chose serait servir faux.
  2. *(A23)* **« Variété max » ne peut pas dépasser « Équilibré »** là où le vivier est
     mince : les deux ouvrent le même panier faute de candidats comparables.
  3. *(A25)* Le plan canonique est à **ZÉRO drapeau bloquant** — ce que le catalogue lui
     coûte, c'est d'avoir **interdit de monter `FAMILY_SELECT_W_CANON` à 0,04**, soit
     6,6 points de quasi-doublons laissés sur la table : à ce réglage apparaît 1 repas
     hors cible sur 1 680, une **collation vegan + sans gluten en sèche**, sans aucune
     alternative propre dans la bande. ⚠️ Ne pas lire ça comme « un repas hors cible est
     servi aujourd'hui » — il ne l'est pas. C'est un plafond, pas un défaut visible.
  4. *(A25)* Les quasi-doublons restants sont **concentrés sur le végétal** : 41,7 % des
     semaines en vegan (contre 8,3 % sans régime), et **50 % en vegan+SG des DEUX côtés** —
     le reroll n'y peut rien, il n'y a pas assez de familles distinctes. Familles en cause
     mesurées : `yaourt_soja_proteine`, `tofu_ferme × nouilles_riz`, `proteine_vegetale`,
     `edamame × maïs`, `seitan`, `tempeh`.
  ➡️ **Viser le végétal, et privilégier des couples protéine × féculent NOUVEAUX** plutôt
  que des variantes des familles ci-dessus : ajouter une neuvième recette au yaourt de soja
  n'enlèverait aucun quasi-doublon. ⚠️ Ce point est **transverse à D19** (qui vise le seuil
  R8) : une recette peut passer R8 et rester un quasi-doublon. Les deux critères se
  commandent ensemble.
  ♻️ **La formulation « petits-déjeuners et collations » a été corrigée à la commande** :
  elle oubliait le repas complet (3ᵉ cellule la plus pauvre) et « riches en protéines » est
  faux au bout haut. Détail dans la liste ♻️ du §« Chantiers ouverts », point B7.
- ~~**D5 · 3 recettes sans ingrédient gras `scalable`**~~ 🚫 **FERMÉ le 2026-07-31 —
  la tâche était fausse sur ses trois affirmations. Ne pas la rouvrir.** Elle disait
  « 3 recettes · le moteur ne peut pas les monter en lipides · l'utilisateur voit
  *sous la cible* · 15 minutes ». Mesuré, dans cet ordre :
  1. **Ce n'est pas 3, c'est 34** (10 % des 314 recettes) : 15 petits-déj, 15
     collations, 4 repas complets. Le chiffre datait d'avant la vague de 113.
  2. **Ces 34 ne causent RIEN.** Sur 1 540 repas générés (13 profils × 5 tirages,
     dont 2 repas/jour, vegan, végétarien, variété basse), le drapeau
     `fat_below_target` tombe **23 fois — et 0 fois sur une de ces 34 recettes**.
     Le moteur ne les sélectionne tout simplement pas quand les lipides comptent
     (`fitScore` les pénalise). Leur ajouter une cuillère d'huile n'aurait déplacé
     aucun plan.
  3. **L'utilisateur ne voit jamais « sous la cible » en lipides** : `MacroBar`
     affiche les lipides en grammes dans une barre de proportion, **sans cible**.
     Seules les kcal sont comparées à une cible. Et `FLAG_AUDIENCE` classe
     `fat_below_target` en `'selection'` — explicitement « ne pas alarmer ».
  Le vrai plafond, quand il mord, est le facteur de rôle `fat = [0.5, 1.5]` : une
  recette bâtie sur 8 g d'huile plafonne à 12 g. C'est un garde-fou culinaire
  volontaire (une portion ne devient pas 24 g d'huile), pas un défaut.
  ➡️ **Ce que la mesure a réellement trouvé est ailleurs et plus sérieux : A9.**
- ~~**D6 · Collations invendables aux petits gabarits**~~ ✅ **FERMÉ le 2026-08-01 par
  le lot B2.** C'était le même problème que D1, pas un chantier séparé : le catalogue
  ne comptait aucune collation légère parce que la vague de 113 n'en avait ajouté
  AUCUNE. Chiffres avant/après dans D1.
- ~~**D7 · 🤖 Pool vegan**~~ ✅ **FERMÉ le 2026-08-02 par le lot B6 — 7 collations vegan
  ajoutées (`col80`→`col86`), collations vegan 36/79 → **43/86**. Fiche complète : D17.**
  L'historique du diagnostic est conservé ci-dessous ; **ne rien y prendre comme consigne.**
  Ce qui reste ouvert et n'est PAS traité par B6 : le point mince **vegan + sans gluten sur
  les petits gabarits en sèche**, en petit-déj et en repas complet (dernier paragraphe 🎯).
  Pool par créneau (champ `restrictions_ok`, celui que lit le moteur) :
  petit-déj **33/78** vegan · midi et soir **57/170** · collations **36/66**.
  Identique à ce qui était écrit : **la vague de 113 n'a ajouté aucune recette vegan.**
  ♻️ **Recompté le 2026-08-01 après le lot B2** : les collations passent à **43/79**
  vegan (+7). Petit-déj et repas complets sont **inchangés** — c'est là que le pool
  reste mince, et c'est là qu'il faudra écrire.
  ♻️ **Recompté le 2026-08-02 après B4 et B5** (mesuré sur `restrictions_ok`, le champ que
  lit le moteur) : petit-déj **44/110** · repas complets **79/270** · collations **36/79**.
  Le petit-déj et le repas complet ont donc bien progressé en valeur absolue (33 → 44 et
  57 → 79), mais **le ratio ne bouge pas** : les vagues B4/B5 ont ajouté du vegan à peu
  près à la proportion existante. ⚠️ Les collations **BAISSENT de 43 à 36**, et c'est
  entièrement imputable à B5 : sur les 23 réécrites, **16 étaient vegan, 9 le sont
  encore**. Les sept perdues, vérifiées une par une — `col04` `col05` `col10` `col16`
  `col58` `col74` sont passées à une ancre laitière (skyr, fromage blanc, cottage, whey)
  et **`col41` à la dinde**. Motif unique : sur un créneau dont la cible va de 187 à
  449 kcal, les ancres végétales disponibles sont soit trop chères en calories par gramme
  de protéine (`tofu_soyeux` 11,7 · `edamame` 11,4), soit sèches donc incuisinables en
  10 minutes (pois chiches, haricots blancs), soit déjà saturées (`proteine_vegetale` et
  `yaourt_soja_proteine` portent les deux plus gros groupes R4, cf. D4).
  ➡️ **C'est la dette la plus concrète laissée par B5**, et elle est ciblée : il faut
  **7 collations vegan** bâties sur une ancre végétale abordable ET un vrai féculent —
  les couples « ancre × aucun féculent » sont fermés.
  ❌ En revanche « en vegan + sèche le pool ne laisse qu'un petit-déj viable » est
  **faux**. Ce qui compte n'est pas le ratio du pool mais ce qu'un utilisateur VOIT :
  sur 4 semaines, les profils vegan reçoivent **8 à 14 petits-déj distincts**
  (F 55 sèche : 10 · F 65 sèche : 8 · H 80 sèche : 7 · F 60 maintien : 14).
  🎯 **Le vrai point mince est ailleurs et il est étroit** : c'est **vegan + sans
  gluten sur les petits gabarits en sèche** — F 55 sèche n'y voit que **3 midis
  distincts** sur 4 semaines, et F 80 sèche vegan que **4 soirs distincts**. C'est
  cette case-là qu'il faut viser, pas « du vegan » en général.
  ⚠️ **Motif = SERVICE, pas marketing** (fondateur, 2026-07-30) : le végétal est **un
  régime supporté parmi 7, sans emphase**. On sert correctement les utilisateurs vegan
  déjà là ; on ne présente Kyroz comme une app vegan **nulle part**.

- ~~**D8 · Lot B1, tranche 1 sur 4**~~ ✅ **LIVRÉ le 2026-08-01 — 20 repas complets
  (`rep171`→`rep190`), catalogue 327 → 347.** Répartition commandée tenue exactement :
  11 carnées · 5 végétariennes · 4 vegan · 12 sans gluten (≥ 9 demandés) · 14 ancres
  protéiques distinctes (6 demandées, plafond 5 par ancre, max atteint 3) · 10 ancres
  grasses. `check:doublons` → 0 violation (R1, R2, R4, R5, R7) · `check:enveloppe` →
  **20/20 conformes, moyenne 10,1 profils servis sur 12**, minimum 8.
  📈 **Effet mesuré en A/B sur le MÊME code** (catalogue ramené à 327 puis restauré) —
  repas complets servables par profil :

  | profil | avant | après | |
  |---|---|---|---|
  | H 80 maintien | 124/170 | **147/190** | +23 |
  | F 70 masse | 116/170 | **137/190** | +21 |
  | F 65 sèche | 111/170 | **131/190** | +20 |
  | F 65 maintien | 149/170 | **169/190** | +20 |
  | H 65 sèche | 127/170 | **147/190** | +20 |
  | H 70 maintien | 143/170 | 162/190 | +19 |
  | F 55 sèche | 109/170 | 127/190 | +18 |
  | F 60 maintien | 151/170 | 168/190 | +17 |
  | F 80 sèche | 107/170 | 120/190 | +13 |
  | H 95 masse | 77/170 | 88/190 | +11 |
  | H 80 sèche | 120/170 | 129/190 | +9 |
  | H 110 masse | 57/170 | 63/190 | +6 |

  **Les 12 profils gagnent**, y compris `H 110 masse` que le lot B2 n'avait pas su servir.
  ⚠️ *Les colonnes petit-déj et collation bougent de ±2 dans la même mesure : les cibles
  sont dérivées de `buildLocalPlan`, donc elles se déplacent un peu quand le catalogue
  change. Le signal est la colonne « repas complet ».*

  🔬 **CINQUIÈME DÉFAUT DE BRIEF, trouvé en générant — le plus grave des cinq, corrigé.**
  Le §4 publiait les valeurs /100 g d'`ingredients_reference` (le **repère manuel**) alors
  que le moteur sert celles de `RECIPE_INGREDIENTS` (**Ciqual** pour les 107 refs mappés).
  **47 refs sur 123 divergent** de plus de 8 % en kcal ou 12 % en protéines :
  `boeuf_bavette` **−5,6 g de protéines aux 100 g**, `mozzarella` +57 kcal, `pesto`
  −80 kcal, `seitan` −4,4 g P. Conséquence directe, constatée sur une recette de ce lot :
  **32 g de protéines dans l'enveloppe sur le papier, 26 servis dans l'assiette** — et R8,
  lui, se mesure sur le moteur. Le générateur publie désormais les valeurs servies, et
  l'exemple JSON du §5 recalcule ses macros dessus au lieu de recopier le catalogue.
  Après correction, les kcal du solveur et celles de `check:enveloppe` coïncident au
  chiffre près.

  🧰 **Ce que ce créneau impose, et qui n'était écrit nulle part** (à savoir avant le lot 2) :
  1. **Un poisson gras ne peut pas porter 30 g de protéines sous un plafond de 18 g de
     lipides.** Maquereau et saumon apportent 13–14 g de lipides aux 100 : à la dose
     protéique nécessaire ils saturent l'enveloppe seuls, et il ne reste rien pour l'ancre
     grasse que le §6.1 rend obligatoire. Même piège sur `tofu_fume` et `tempeh`. Solution :
     ancre maigre + vraie ancre grasse, ou féculent riche en protéines (boulgour, pâtes
     complètes, sarrasin) pour que l'ancre reste petite.
  2. **Les légumineuses prêtes à consommer sont inutilisables comme féculent ici**, alors
     que le §3 les recommande : 58 g de glucides demanderaient 360 g de lentilles cuites.
     Elles ne servent qu'en ancre protéique ou en complément.
  3. **Une recette à 4 ingrédients est fragile sur R1** : 3 refs partagés donnent
     Jaccard 0,60 = rejet. À 5 ingrédients le même partage tombe à 0,43. Trois recettes ont
     dû être réécrites pour ça.
- ~~**D9 · Lot B1, tranche 2 sur 4**~~ ✅ **LIVRÉ le 2026-08-01 — 20 repas complets
  (`rep191`→`rep210`), catalogue 347 → 367.** Répartition tenue : 11 carnées ·
  5 végétariennes · 4 vegan · 10 sans gluten · 13 ancres protéiques distinctes, **jamais
  plus de 2 fois la même**. `check:doublons` → 0 violation · `check:enveloppe` → 20/20,
  moyenne 9,8 profils sur 12. Le brief régénéré après la tranche 1 a fait son travail :
  il affichait déjà `dinde_escalope`, `jambon_blanc` et `sardines` comme consommés.
  📈 Repas complets servables, **190/190 → 210/210** : F 55 sèche 127 → **148**,
  H 65 sèche 147 → **169**, H 110 masse 63 → **69**. Les 12 profils gagnent à nouveau.
  ⚠️ **Trois recettes réécrites en cours de route**, toutes sur des collisions que seul le
  script voit : `soja_texture + tortilla + maïs + avocat` existait déjà à l'identique
  (4 refs communs), et « Seitan patate douce » partageait ses 3 premiers mots avec `rep41`.
- ~~**D10 · Lot B1, tranche 3 sur 4**~~ ✅ **LIVRÉ le 2026-08-01 — 20 repas complets
  (`rep211`→`rep230`), catalogue 367 → 387.** 11 carnées · 4 végétariennes · 5 vegan ·
  9 sans gluten · 15 ancres protéiques distinctes. `check:doublons` → 0 violation ·
  `check:enveloppe` → 20/20.
  📈 Repas complets servables, **210/210 → 230/230** : F 55 sèche 148 → **168**,
  H 65 sèche 169 → **189**, H 110 masse 69 → **74**.
  ⚠️ **Le sans-gluten est tombé à 7 sur 9 demandés au premier jet, à cause de `sauce_soja`** :
  elle est faite de blé et casse le régime, alors qu'elle ne pèse rien dans les macros et
  qu'on la pose sans y penser. Remplacée par `oignon` dans deux recettes. À vérifier
  systématiquement : le sans-gluten se compte sur TOUS les refs, pas seulement sur le féculent.
- ~~**D11 · Lot B1, tranche 4 sur 4 — LA VAGUE B1 EST COMPLÈTE**~~ ✅ **LIVRÉ le 2026-08-01
  — 20 repas complets (`rep231`→`rep250`), catalogue 387 → 407.** 11 carnées ·
  4 végétariennes · 5 vegan · 11 sans gluten · 15 ancres protéiques distinctes.
  `check:doublons` → 0 violation · `check:enveloppe` → 20/20.

  🏁 **Bilan des 4 tranches — repas complets servables, 170 → 250 recettes :**

  | profil | avant | après | |
  |---|---|---|---|
  | F 65 maintien | 149/170 | **227/250** | +78 |
  | F 60 maintien | 151/170 | **227/250** | +76 |
  | H 70 maintien | 143/170 | **218/250** | +75 |
  | F 55 sèche | 109/170 | **188/250** | +79 |
  | F 65 sèche | 111/170 | **192/250** | +81 |
  | F 70 masse | 116/170 | **192/250** | +76 |
  | H 65 sèche | 127/170 | **207/250** | +80 |
  | H 80 maintien | 124/170 | **205/250** | +81 |
  | F 80 sèche | 107/170 | 169/250 | +62 |
  | H 80 sèche | 120/170 | 163/250 | +43 |
  | H 95 masse | 77/170 | 122/250 | +45 |
  | H 110 masse | 57/170 | 79/250 | +22 |

  **Les 12 profils gagnent**, mais l'écart se creuse : `H 110 masse` reste à **32 %** du
  catalogue quand `F 65 maintien` est à 91 %. L'enveloppe 520–580 kcal du brief est calée
  sur la médiane, et le moteur ne monte un plat que jusqu'à ×1,8 — les très gros gabarits
  resteront mal servis tant qu'un lot ne visera pas explicitement 650–750 kcal de base.
  🧑 **C'est le vrai chantier catalogue suivant**, plus utile qu'un cinquième lot à la même
  enveloppe.

- ~~**D12 · Lot B3 — 20 petits-déjeuners**~~ ✅ **LIVRÉ le 2026-08-01 — `pd79`→`pd98`,
  catalogue 407 → 427. Plus aucun lot commandé n'est en attente.** Répartition tenue
  exactement : 6 carnées · 7 végétariennes · 7 vegan · **14 sans gluten** (9 demandés) ·
  11 ancres protéiques distinctes. `check:doublons` → 0 violation · `check:enveloppe` →
  20/20.
  📈 **Effet mesuré en A/B sur le MÊME code** — petits-déjeuners servables, 78 → 98 :

  | profil | avant | après | |
  |---|---|---|---|
  | H 95 masse | 34/78 | **53/98** | +19 |
  | H 65 sèche | 43/78 | **62/98** | +19 |
  | H 70 maintien | 55/78 | **74/98** | +19 |
  | H 80 maintien | 54/78 | 74/98 | +20 |
  | F 55 sèche | 53/78 | **73/98** | +20 |
  | F 65 sèche | 56/78 | 76/98 | +20 |
  | F 60 maintien | 56/78 | 75/98 | +19 |
  | F 70 masse | 50/78 | 70/98 | +20 |
  | F 80 sèche | 44/78 | 62/98 | +18 |
  | F 65 maintien | 58/78 | 76/98 | +18 |
  | H 80 sèche | 37/78 | 44/98 | +7 |
  | **H 110 masse** | 23/78 | 23/98 | **+0** |

  🔬 **CE QUI DÉCIDE DE LA COUVERTURE D'UN PETIT-DÉJEUNER, mesuré — à savoir avant le
  prochain lot.** Trois recettes ont d'abord ÉCHOUÉ R8 (6 ou 7 profils sur 12) alors
  qu'elles étaient parfaitement dans l'enveloppe macro. La cause n'est ni les kcal ni les
  grammes : c'est le **coût calorique du gramme de protéine de l'ancre**.

  | ancre | kcal par g de protéine | R8 |
  |---|---|---|
  | `blanc_oeuf` | 4,4 | ✅ |
  | `dinde_escalope` | 4,6 | ✅ |
  | `proteine_vegetale` | 5,2 | ✅ |
  | `skyr` | 5,7 | ✅ |
  | `yaourt_soja_proteine` | 7,2 | ✅ |
  | `oeuf_entier` | 10,9 | ❌ 6/12 |
  | `tofu_fume` | 11,0 | ❌ 7/12 |
  | `lentilles_cuites` | 12,4 | ❌ 6/12 |

  Les profils en sèche demandent **beaucoup de protéines pour peu de calories**
  (F 80 sèche : 450 kcal · 34 g). Une ancre chère plafonne : monter la protéine fait
  exploser les kcal avant d'atteindre la cible, et `adaptRecipe` lève
  `protein_below_target`. **Viser ≤ 8 kcal par gramme de protéine sur l'ancre**, et lui
  faire porter ≥ 60 % de la protéine de la recette.
  ♻️ Contournement utile trouvé au passage : la **`levure_maltee` déclarée `protein` et
  `scalable`** (50 g de protéines aux 100, 7 kcal/g P) sert de second étage protéique et
  rattrape une ancre trop grasse — c'est ce qui a sauvé le tofu fumé de `pd93`.
  ⚠️ **`H 110 masse` ne gagne AUCUN petit-déjeuner** (23/98, inchangé) et `H 80 sèche` n'en
  gagne que 7. Même diagnostic qu'en repas complets : l'enveloppe 430–480 kcal ne peut pas
  atteindre 834 kcal avec un facteur ×1,8. ➡️ **Cause trouvée, ce n'était pas un manque de
  recettes : voir D13.**

- ~~**D13 · Les gros gabarits — l'ENVELOPPE DES BRIEFS était fausse, pas le catalogue**~~
  ✅ **CORRIGÉ le 2026-08-01.** C'est la découverte la plus lourde de conséquences de la
  série : les six lots déjà commandés l'ont été dans une enveloppe calée sur une borne du
  moteur qui **n'existe plus depuis le 2026-07-30**.

  🔴 **LE DÉFAUT.** Le §2 de tous les briefs imprimait :
  `| protein | **1,00** | 1,70 | Ne descend JAMAIS sous ta quantité. Plancher définitif. |`
  puis en tirait la doctrine « **écris des quantités de base PETITES** ». Or
  `config.scaling_factors_by_role.protein` vaut **[0,5 ; 1,7]** depuis le commit `f67b8b1`
  (« borne basse de l'ancre proteine 1,0 → 0,5, décision fondateur »), et `CLAUDE.md` §1
  le documente. Le tableau était **écrit en dur** dans `scripts/gen-brief-lot.ts`, jamais
  dérivé de la config. Mesuré : **47,5 % des 5 160 ancres protéiques du catalogue sont
  servies SOUS la quantité écrite**, 357 exactement au plancher ×0,50.
  Son exemple chiffré était faux aussi : le brief annonçait « poulet 100 + riz 90 → 12/12,
  poulet 160 + riz 40 → 6/12 » ; re-mesuré, **11/12 et 4/12**.

  🔧 **CE QUI EST RÉPARÉ.**
  - Le tableau §2 est **dérivé de `RECIPE_CONFIG`**, et sa grille de bases est **mesurée à
    la génération** par `adaptRecipe` sur les 12 profils. Il ne peut plus diverger.
  - **`check:enveloppe` ne jugeait que le MIDI** alors que `lib/recipeMap.ts` tague les
    250 repas complets `['lunch','dinner']` — et la cible du soir est plus basse (415 kcal
    au minimum contre 459). Il retient désormais le **pire des deux créneaux**. Les 5 lots
    livrés repassent tous ✅.

  📐 **NOUVELLES ENVELOPPES**, mesurées puis vérifiées par 7 agents adversariaux sur deux
  oracles indépendants (cible moyenne 4 semaines ET cibles individuelles) :

  | créneau | avant | après | profils servis |
  |---|---|---|---|
  | repas complet | 520–580 kcal · 30–34 g P | **620–700 · 38–44** | 8,77 → **9,60 / 12** |
  | petit-déjeuner | 430–480 · 24–28 | **520–580 · 30–34** | 8,28 → **9,94 / 12** |

  ⚠️ **L'AVERTISSEMENT À NE JAMAIS PERDRE — ce ne sont pas les calories, c'est la DENSITÉ
  PROTÉIQUE.** Monter les kcal en gardant la protéine du brief donne **7,94/12, MOINS bien
  qu'avant**, et **échange une population contre une autre** : `H 110 masse` passe de 21 %
  à 89 % de service, mais `F 55 sèche` s'effondre de **77 % à 17 %**. Le brief impose donc
  les trois bornes ensemble (kcal, protéines, densité en toutes lettres, ≈ 5,4–7,1 g P
  pour 100 kcal). **Si une seule borne devait être reprise, ce serait celle des protéines.**

  ⚠️ **« 12/12 » EST INATTEIGNABLE et le mot est banni des briefs.** Une composition isolée
  peut servir 12 profils ; une enveloppe, non. Balayée sur les 250 recettes réelles, la
  moyenne la plus haute jamais atteinte est **10,2/12**, quelle que soit l'enveloppe.

  🧪 **Test d'écrivabilité par PAIRES** (même composition aux deux enveloppes), qui a
  corrigé une affirmation que j'avais écrite dans le brief :
  poulet+riz **11 → 12/12** · skyr+sarrasin **10 → 12/12** · bœuf+pâtes **10 → 11/12** ·
  tofu+quinoa 6 → 6. **Les légumineuses sèches n'ont PAS été tuées par la nouvelle
  enveloppe : `pois_chiches` sec est infaisable aux DEUX, `lentilles_vertes` rend 2/12 aux
  deux.** Elles n'ont jamais fonctionné. Seule régression réelle : **l'œuf entier sur pain
  au petit-déj, 7 → 5/12** (10,9 kcal par gramme de protéine).

  📦 **Lot B4 → livré, voir D14.**

  🧹 **`Recette/BRIEF-GENERATION-RECETTES.md` est corrigé aussi** : les 5 lignes qui
  annonçaient encore la borne 1,00 (l. 29, 465, 683, 780, 1153) sont rectifiées, et un
  bandeau au-dessus du tableau des facteurs dit que **la source de vérité est
  `config.scaling_factors_by_role`, jamais un tableau recopié**.
  ⚠️ **Régression signalée** : `col72` est passée à **2/12** sous le seuil R8 de 3. Ce n'est
  pas le contrôle qui a changé pour les collations — c'est l'agrandissement du catalogue
  (327 → 427) qui a fait disparaître la dérogation « profil affamé » dont elle bénéficiait.
  ➡️ **Traité le 2026-08-02, et ce n'était pas un cas isolé : voir D15.**

- ~~**D14 · Lot B4 — 32 recettes à l'enveloppe corrigée**~~ ✅ **LIVRÉ le 2026-08-02 —
  `rep251`→`rep270` (20 repas complets) et `pd99`→`pd110` (12 petits-déjeuners), catalogue
  427 → 459, `ENGINE_VERSION` 33 → 34.** Premier lot écrit à l'enveloppe de D13.
  `check:doublons` 0 violation · `check:enveloppe` conforme (repas **11,4/12** de moyenne,
  petits-déj **11,6/12**) · 791 tests verts · `tsc` propre.

  🔴 **CE QUE ÇA NE RÈGLE PAS, ET C'EST LE POINT IMPORTANT.** Le lot double le vivier de
  petits-déjeuners des gros gabarits mais **ne bouge quasiment pas celui des repas
  complets** :

  | pool servable | avant (427) | après (459) |
  |---|---|---|
  | `H 110 masse` · petit-déj | 23/98 (23 %) | **43/110 (39 %)** |
  | `H 110 masse` · repas complet | 79/250 (32 %) | 85/270 (**31 %**) |
  | `H 95 masse` · petit-déj | 53/98 (54 %) | 63/110 (57 %) |
  | `H 95 masse` · repas complet | 122/250 (49 %) | 138/270 (51 %) |

  ⚠️ **La raison est contre-intuitive et vaut pour toutes les vagues à venir : LA CIBLE
  BOUGE QUAND LE CATALOGUE BOUGE.** Les cibles de `ciblesDe` sont reconstruites depuis des
  plans réellement générés — ajouter des recettes change les plans, donc les cibles. Mesuré
  pour `H 110 masse` : midi **1057 → 1065 kcal**, soir **944 → 958**. Détail exact du
  vivier midi : **+16 recettes B4 servables, +2 anciennes entrées, −12 anciennes sorties**
  (elles tombaient sous le plancher `under_target_kcal` = 0,88 × cible une fois la cible
  relevée). Net : +6. ➡️ **Ne jamais annoncer le gain d'une vague en additionnant les
  recettes conformes : il faut re-mesurer le catalogue entier après merge.**
  ➡️ 🧑 **Le créneau midi/soir des gros gabarits reste ouvert** — il demande une vague de
  plus, pas une correction d'enveloppe.

  🧪 **Un test a sauté, et il avait tort avant de sauter.** `variety.test.ts` > « biais
  fibres en sèche » ne tirait **qu'un seul plan (seed 0)** et appelait ça « le biais ».
  Mesuré sur 40 seeds à budget figé, le catalogue de 427 donnait **×1,042** en moyenne et
  ne dépassait ×1,08 que sur **3 seeds sur 40** : le test ne passait que parce que la
  seed 0 était l'une des trois. B4 a déplacé le tirage et il est tombé — alors qu'il
  **améliore** le biais (**×1,061**, 16/40 seeds au-dessus de 1,08). L'oracle est devenu
  la **moyenne sur 12 seeds**, seuil ×1,02. Il garde ses dents : nudge coupé
  (`FIBER_SELECT_W`/`FIBER_BAND_BONUS` à 0), la sèche tombe à ×0,885.

- ~~**D15 · Le créneau collation — 20 recettes sur 79 ne servaient (presque) personne**~~
  ✅ **RÉÉCRIT le 2026-08-02 — 23 collations, mêmes ids, `ENGINE_VERSION` 34 → 35.**
  Le point de départ était `col72` (D13). Mesuré, ce n'était pas une régression isolée :
  **20 collations sur 79 étaient sous le seuil R8 de 3/12, dont 6 à ZÉRO** — aucun des
  12 profils ne pouvait les recevoir. Elles occupaient un quart du créneau sans jamais
  être servies.

  | | avant | après |
  |---|---|---|
  | sous le seuil R8 (3/12) | **20 / 79** | **0 / 79** (2 depuis D16, cf. §📍) |
  | score moyen par recette | 4,52 / 12 | **6,90 / 12** (7,19 depuis D16) |
  | vivier `F 55 sèche` | 25 / 79 | **42 / 79** |
  | vivier `H 95 masse` | 19 / 79 | **39 / 79** |
  | vivier `H 110 masse` | 18 / 79 | **31 / 79** |

  🔎 **LES QUATRE CAUSES, mesurées — elles valent règle pour toute collation future.**
  1. **Un ingrédient FIXE (`vegetable`/`flavor`) est fatal sur ce créneau.** La cible va de
     187 à 449 kcal (×2,4) ; un poids qui ne bouge pas ne rétrécit pas pour la première et
     ne grandit pas pour la seconde. Les trois collations salées à bâtonnets de carotte y
     sont toutes mortes.
  2. **L'élasticité doit venir de refs SANS `abs_max_qty`.** Toutes les sources de gras du
     catalogue sont plafonnées à 30–40 g : une collation qui compte sur les oléagineux pour
     monter en calories tape le plafond avant d'atteindre un gros gabarit.
  3. **Une ancre protéique chère plafonne.** `yaourt_grec` coûte 12,8 kcal par gramme de
     protéine — les trois collations bâties dessus étaient à 2/12. Viser ≤ 9.
  4. **Le couple (protéines × féculent) « ∅ » est saturé** : 9 collations en
     `yaourt_soja_proteine × aucun féculent`, 5 en `proteine_vegetale × ∅`. Toute nouvelle
     collation doit porter un vrai `carb`.

  ⚠️ **La cible qui bouge (cf. D14) s'est reproduite, et c'était prévisible** : réécrire les
  20 premières a fait tomber **3 collations intactes** de 3/12 à 2/12. Elles ont été
  réécrites dans la foulée (`col03`, `col25`, `col64`) — d'où 23 et non 20. ➡️ **Contrôler
  le créneau ENTIER après une vague, jamais seulement le lot livré.**

  🆕 **Une vague peut désormais RÉÉCRIRE au lieu d'ajouter** (première fois ici). Les ids
  sont conservés (favoris, recettes masquées, overrides), `wave` bascule sur la vague de
  réécriture, et les vagues d'origine perdent les recettes reprises dans la partition de
  `recipeData.test.ts`. Convention écrite dans `Recette/README.md`.

  ⚠️ **Ce que ça ne réglait pas** : `F 70 masse` restait le profil le plus mal servi
  (25/79), sur une cible collation de 311 kcal pour **5 g de protéines**. Diagnostic posé
  et corrigé le jour même — c'était un défaut du MOTEUR, pas du catalogue : voir **D16**
  (vivier 25 → 36).
  ⚠️ **Le prix payé, chiffré** : la réécriture a coûté **7 collations vegan** (16 des 23
  réécrites l'étaient, 9 le sont encore). Détail et remède dans **D7** — c'est la seule
  dette ouverte laissée par ce lot.

- ~~**D16 · La cible protéique du DERNIER repas s'effondrait — défaut du moteur, pas du catalogue**~~
  ✅ **CORRIGÉ le 2026-08-02 — `PROT_SHARE_FLOOR` dans `lib/planEngine.ts`,
  `ENGINE_VERSION` 35 → 36.** Point de départ : `F 70 masse`, le dernier profil encore
  mal servi en collation (25/79) après D15. Ce n'était pas un manque de recettes.

  🔴 **LE MÉCANISME.** `mealTarget` calcule la cible d'un repas au prorata du budget
  **RESTANT**. Chaque repas qui dépasse sa part rogne celle des suivants, et le dernier
  servi — la collation, dernière de `MEAL_ORDER` — encaisse toute la dérive. Mesuré sur
  `F 70 masse`, repas par repas : petit-déj cible 25 → servi 28, midi 29 → 35, soir
  22 → 27, **collation 5 → 12**. Sa part équitable est 12,7 g de protéines ; le moteur
  lui en demandait **5,4**.

  Une cible de 311 kcal pour 5,4 g de protéines, c'est une densité de **1,7 g pour
  100 kcal** — aucune collation du catalogue ne peut viser ça. Pire, le moteur en
  déduisait un besoin de **47 g de glucides**, la recette débordait en calories pour
  l'atteindre, et `over_target_kcal` se levait : **35 collations sur 79 jugées « trop
  grosses » pour une cible de 311 kcal**. Le symptôme (créneau collation pauvre) était à
  l'opposé de la cause (cible protéique dégénérée).

  🔧 **LE CORRECTIF.** La cible protéique d'un repas ne peut plus descendre sous **0,7 ×
  sa part équitable** du budget du jour, bornée par les kcal du repas.

  | | avant | après |
  |---|---|---|
  | `carbs_below_target` sur 1 344 repas servis | **15** | **0** |
  | vivier collation `F 70 masse` | 25 / 79 | **36 / 79** |
  | vivier collation `H 95 masse` | 39 / 79 | **46 / 79** |
  | vivier repas complet `H 110 masse` | 70 / 270 | **74 / 270** |
  | précision calorique du jour | 0,07 % | **0,05 %** |
  | protéines servies / cible | +2,35 % | +2,56 % |

  ⚠️ **0,7 est un point MESURÉ.** Balayé de 0 à 1 : le vivier TOTAL monte encore à 0,85
  (3 925 contre 3 889), mais au prix du créneau le plus rare du catalogue — les repas
  complets de `H 110 masse` tombent de 74 à **65**. C'est exactement le piège de
  `CLAUDE.md` §10 : ne jamais agréger ce qu'un utilisateur voit séparément. À 1,0 la cible
  ignore le budget restant et les protéines servies dépassent de 6,2 % sans rien gagner.
  ⚠️ **Une régression assumée** : `H 80 maintien` perd 6 collations (48 → 42). Tous les
  autres profils gagnent ou sont stables.
  ⚠️ **Ce que le plancher NE cause PAS, vérifié des deux côtés** : le dépassement
  protéique quotidien. Sur 42 jours d'un gabarit en prise de masse, le pire jour vaut
  ×1,135 de la cible **avec ET sans** plancher. Il vient de recettes plus protéinées que
  la cible, et il préexistait. Verrouillé par `lib/__tests__/mealProteinFloor.test.ts`,
  qui échoue si le plancher disparaît.

  ⚠️ **Pas d'`ENGINE_REV`** : la cible calorique du jour ne bouge pas (0,07 % → 0,05 %
  d'écart), seule la répartition entre repas change. Le seuil d'avertissement one-shot
  (100 kcal/jour) n'est pas approché.

  📉 **Et un rappel de plus sur la métrique elle-même** : le vivier `H 110 masse` en repas
  complet valait 85/270 après B4 et 70/270 après B5 — la vague B5 n'a pourtant touché QUE
  des collations. Troisième occurrence du même effet (cf. D14) : **les cibles de l'audit
  sont reconstruites depuis des plans réellement générés, donc toute vague les déplace.**
  ➡️ Ne jamais annoncer le gain d'une vague avec ce chiffre sans re-mesurer après merge.
  ⚠️ **Quatrième occurrence, causée par CE correctif** : D15 avait ramené le créneau
  collation à 0 recette sous le seuil R8 ; ce plancher, qui ne touche aucune recette, en
  remet **2** dessous (`col07`, `col38`, à 2/12) tout en montant la moyenne de 6,90 à
  **7,19/12**. Les deux sont des cas d'école du §4.12 du brief (ancre `yaourt_grec` à
  12,8 kcal par gramme de protéine · `vegetable` à poids fixe). **Elles n'ont volontairement
  pas été réécrites** : courir après la queue de distribution en déplace deux autres.
  Le repère à suivre est la moyenne, pas le compteur.

- ~~**D17 · Lot B6 — les 7 collations vegan que B5 avait coûtées**~~
  ✅ **LIVRÉ le 2026-08-02 — `col80`→`col86`, catalogue 459 → 466, `ENGINE_VERSION`
  36 → 37.** Ferme la dette chiffrée en D7 et en D15. Écrit **en session**, sans brief de
  lot : 7 recettes très contraintes se calent plus vite en mesurant qu'en commandant.

  | | avant B6 | après B6 |
  |---|---|---|
  | collations | 79 | **86** |
  | collations vegan | 36 / 79 | **43 / 86** |
  | collations vegan **+ sans gluten** | 29 | **34** |
  | score moyen du créneau | 7,19 / 12 | **7,62 / 12** |
  | sous le seuil R8 | 2 (`col07`, `col38`) | **1** (`col07` seule) |
  | vivier collation `F 70 masse` | 36 / 79 | **54 / 86** |
  | vivier collation `H 110 masse` | 35 / 79 | **44 / 86** |

  **Les 7, et le trou que chacune bouche** — toutes ≥ 10/12, six à 12/12 :
  `col80` sarrasin torréfié + yaourt de soja · `col81` polenta + protéine de pois ·
  `col82` wrap au soja texturé et avocat (**la seule collation salée à emporter à la fois
  vegan ET sans gluten**) · `col83` seitan poêlé au maïs (**la seule salée chaude**) ·
  `col84` tartine complète + purée de cacahuète · `col85` crème de châtaigne · `col86`
  quinoa froid à l'ananas. `check:doublons` → **0 violation** et les compteurs du
  catalogue live ne bougent pas (R1 81 · R2 70 · R4 14 · R5 17) : les 7 couples
  (protéine × féculent) employés étaient libres ou à 1, donc D4 n'empire pas.

  🔬 **CE QUE LA MESURE A TROUVÉ, et qui vaut plus que le lot lui-même : l'ancre grasse
  a un optimum, et il est bas.** `col84` a été écrite à 12 g de purée de cacahuète et
  mesurait **6/12**. À composition strictement identique, 8 g → **12/12**, 16 g → 3/12.
  Même courbe sur `col80` (noisettes). Le drapeau qui tombe est toujours `over_target_kcal`,
  et **sur les cibles MOYENNES**, pas sur les extrêmes : une ancre grasse ne descend pas
  sous ×0,5, et à 9 kcal le gramme elle fixe un plancher que la recette ne peut plus
  franchir. L'exception, mesurée elle aussi : avec une ancre protéique très dense
  (`proteine_vegetale`), `col86` tient 12/12 jusqu'à 18 g d'amandes.
  ➡️ Écrit en **règle 5 du §4.12** du brief avec sa table de mesure. Une collation à
  l'ancre volumineuse se cale entre **6 et 9 g de lipides**.

  ⚠️ **Ce que B6 ne prouve PAS, et il faut le dire dans cet ordre.** Le vivier vegan par
  profil grimpe bien plus que de 7 (`F 70 masse` 18 → 32 collations vegan servables) —
  **ce n'est pas le lot, c'est le déplacement des cibles** (5ᵉ occurrence du piège de
  mesure, cf. §📍). Et **la variété RÉELLEMENT servie ne bouge quasiment pas** : sur
  4 semaines, un profil vegan voyait 9 à 13 collations distinctes, il en voit 10 à 14.
  La rotation plafonnait déjà. Le gain de B6 est une **réserve** — de la marge quand un
  profil masque des recettes, quand la vague suivante en réécrit, ou quand un goût
  écarte une ancre. Ce n'est pas un gain visible par l'utilisateur, et il ne faut pas le
  présenter comme tel.

  ⚠️ **`col07` reste seule sous le seuil et ne sera pas réécrite** — même raison qu'en
  D16 : la queue de distribution n'est pas un état stable.

- ~~**D18 · La variété perçue — le moteur faisait tourner les IDS, pas les ASSIETTES**~~
  ✅ **CORRIGÉ le 2026-08-02 — `FAMILY_FIBER_TOL` dans `lib/planEngine.ts`,
  `ENGINE_VERSION` 37 → 38.** Point de départ : D4, qui demandait de désaturer 14 groupes
  du catalogue. La mesure a renvoyé la tâche au moteur.

  🔴 **LE MÉCANISME.** `selectMealAdapted` fait tourner les recettes par **id**
  (`usage[id] × VARIETY_STEP`). Deux recettes bâties sur le même couple protéine ×
  féculent — « poulet-riz-brocoli » et « wok poulet-riz-légumes » — sont deux ids
  distincts pour le moteur, et une répétition pour celui qui mange.

  ⚠️ **Tableau HISTORIQUE — la colonne « après » est celle du 2026-08-02 AU MOMENT DE D18.**
  A21 puis A25 ont fait entrer la famille dans le SCORE (elle n'était ici qu'une clé de
  départage) : l'état courant est **20,8 %**, pas 27,9 %. Pour les chiffres du jour, la
  photo d'état en tête de fichier ou `npm run mesure:variete`. Même piège que la table
  d'A21 plus haut : une colonne « après » vieillit dès le correctif suivant.

  | mesuré sur 240 semaines (12 profils × 5 régimes × 4 tirages) | avant | après (à D18) |
  |---|---|---|
  | semaines contenant ≥ 2 recettes d'un même couple | **56,3 %** | **27,9 %** |
  | quasi-doublons servis | 203 | **93** |
  | drapeaux bloquants | 18 | **14** |
  | écart calorique du jour | 0,35 % | 0,36 % |
  | fibres/1000 kcal en sèche | 20,62 | 20,59 |
  | pool le plus mince (F 55 sèche vegan+SG) : distinctes / drapeaux | 27 / 8 | **28 / 5** |
  | `preferred_proteins` respectées (poulet déclaré) | 31,1 % | **31,3 %** |

  🔎 **CE QUE LA MESURE A RENVERSÉ, et c'est le cœur de la fiche.** Les couples servis en
  quasi-doublon ne sont PAS ceux que R4 signale. Classement mesuré avant correctif :
  `edamame × maïs` en collation, **48 semaines — un groupe de DEUX recettes**, donc légal
  pour R4 ; puis `yaourt_soja × ∅` (8 recettes, 44) ; puis `tempeh × riz complet` (3, 14) ;
  puis `protéine végétale × châtaigne` (**2**, 10). Six des dix pires sont des groupes
  de 2. ➡️ **Un compteur de catalogue ne mesure pas ce qu'un utilisateur reçoit.** C'est
  la troisième fois que ce piège se referme (D5 : 34 recettes « en cause » qui ne
  causaient rien · D7 : un ratio de pool qui ne se voyait pas dans le service).

  🔬 **TROIS RÉGLAGES ONT ÉTÉ ESSAYÉS ET DEUX SONT ÉCARTÉS, chacun par sa mesure.**
  1. **La famille dans le score effectif** (`+ 0,03 × familyUsage`) : 41,3 %, mais 0,03
     dépasse la bande de départage de `balanced` (0,024) — elle éjectait de la bande les
     recettes fibreuses que le nudge fibres venait d'y faire entrer. **Le test P3.2 est
     tombé** (ratio ×0,96 pour un seuil de ×1,02). Les deux nudges se disputaient la
     même bande. ❌
  2. **Couper la bande sur les fibres avant le tri** : le meilleur chiffre obtenu,
     **9,6 %** de quasi-doublons — et rejeté. Les repas servis à qui déclare préférer le
     poulet tombaient de 27,2 % à **18,3 %**, le poisson de 73,8 % à 51,5 %, et les
     drapeaux bloquants doublaient (17 → 35). La mesure décisive est venue de l'agent
     lui-même : le filtre de famille SEUL ne coûte rien sur `preferred` (25,9 %), c'est
     le pré-tri fibres qui détruit la hiérarchie — or c'est lui qui faisait passer P3.2.
     Dans cette structure, **la marge fibres et le signal de l'utilisateur sont le même
     curseur tiré dans deux sens**. ❌
  3. **Clé de départage bornée en grammes de fibres**, placée APRÈS `preferred` et
     `need` : elle réordonne `pickable`, elle n'exclut jamais. ✅ **RETENUE.**

  ⚠️ **La valeur 7 g est un point mesuré, et ce n'est ni le minimum de la courbe ni le
  plus prudent.** Balayage complet (quasi-doublons · drapeaux · fibres sèche · pool mince
  distinctes/drapeaux) : `OFF` 56,3 · 18 · 20,62 · 27/8 — `6` 28,7 · 18 · 20,59 · **28/10**
  — `7` **27,9 · 14 · 20,59 · 28/5** — `8` 25,0 · 14 · 20,59 · 28/5 — `8,5` 26,7 · 20 ·
  20,11 · 28/11 — `9` 26,7 · 20 · 20,11 · 26/11.
  **6 g était mon premier choix « pour la marge » et la mesure l'a écarté** : c'est le
  SEUL réglage qui dégrade le pool le plus mince (10 drapeaux contre 8 sans rotation).
  Prendre de la marge y coûtait aux profils déjà les moins bien servis. 7 prend les mêmes
  gains que 8 et s'assied **1,5 g sous la falaise** au lieu de 0,5 : entre 8 et 8,5 les
  trois contrôles basculent ensemble. Le catalogue bouge encore — c'est exactement comme
  ça que le lot B4 avait fait tomber P3.2. **Recalibrer par balayage, jamais à vue.**

  ⚠️ **Pas d'`ENGINE_REV`** : la cible calorique du jour ne bouge pas (0,35 → 0,36 %
  d'écart), seule la composition de la semaine change. Le seuil d'avertissement one-shot
  (100 kcal/jour) n'est pas approché. `ENGINE_VERSION` 37 → 38, en revanche, est
  obligatoire : un plan en cache servirait l'ancienne rotation.

  🧰 **Outillage laissé derrière** : `npm run mesure:variete` (le défaut n'était visible
  d'AUCUN contrôle existant) et `lib/__tests__/varieteFamille.test.ts`, qui échoue si le
  mécanisme disparaît — vérifié en le débranchant.

  ⚠️ **Ce que ça ne règle PAS, assumé** : la clé bornée ne sait pas déloger une famille
  très fibreuse. `repas_complet | tempeh × riz complet` reste à 11 semaines sur 240 (contre 14 avant). Le
  classement des pires contrevenants change ; ce n'est pas une régression cachée.

  ⚠️ **La vérification adversariale prévue N'A PAS TOURNÉ** : les 6 agents de vérification
  ont échoué sur la limite de session. Les chiffres ci-dessus ont été re-mesurés à la main
  (balayage complet, coût sur `preferred_proteins`, pool mince, plan canonique, reroll,
  performance 12 ms/plan) — mais aucune lentille indépendante n'a cherché à les réfuter.

- ~~**D20 · `rep10` — le dernier drapeau bloquant, et la pire recette du créneau**~~
  ✅ **LIVRÉ le 2026-08-03.** Point de départ : le drapeau laissé ouvert par B9
  (`H 110 masse · vegan+SG`, seed 2, `rep10` rendait 40 g de protéines pour 44 demandés).
  Mesuré avant de toucher quoi que ce soit — et **le drapeau n'était pas le sujet**.

  📉 **`rep10` servait 4 profils sur 12** — dernier rang des 17 recettes ancrées pois
  chiches (à égalité avec `rep85`) et dernier rang du pool vegan + sans gluten. Sur les
  24 cellules (12 profils × midi/soir), **13 échouaient** : le drapeau dominant n'était
  pas `protein_below_target` (9 cellules) mais **`over_target_kcal` (10 cellules)**, et
  6 cellules portaient les deux. La recette plafonnait à
  **3,87 g de protéines pour 100 kcal** quand une femme de 55 kg en sèche en demande
  **6,8**. Pour servir 28 g de protéines il fallait lui poser 535 kcal dans l'assiette
  pour une cible de 412. ➡️ **Un drapeau protéine peut être le symptôme d'un défaut
  calorique** : c'est la DENSITÉ qui décide, pas la quantité d'ancre.

  🔧 **Le fait de moteur qui commande tout, et qui n'était écrit nulle part** :
  `adaptRecipe` scale **toutes les ancres protéiques par le MÊME facteur `kp`**
  (`lib/adaptRecipe.ts`, étape 2). Ajouter une seconde ancre ne découple donc PAS la
  protéine des calories — seule la densité **mélangée** du couple d'ancres compte. C'est
  ce qui rend une retouche de quantité inutile ici, et ce qui explique la forme des
  recettes qui tiennent 12/12 (`rep275`, `rep277`) : **une seule ancre très dense et peu
  calorique**, jamais deux ancres moyennes.

  🚫 **La retouche évidente était fermée, et c'est mesuré** : ajouter de la PST à `rep10`
  viole R2 contre `rep91`, `rep104` ET `rep159` — les trois partagent déjà
  `pois_chiches + soja_texture + lait_coco`, donc toute quatrième `ref` commune fait
  quatre. Le curry de pois chiches végétal est un espace **saturé**. Ne pas rouvrir cette
  piste.

  📐 **Ce qui a été écrit** : `Tofu et pois chiches au lait de coco, épinards et riz` —
  tofu ferme 200 g, pois chiches en conserve 100 g, riz 50 g, lait de coco 40 ml,
  épinards 100 g, tomate concassée 120 g. **732 kcal · 41,9 g de protéines · densité 5,73**.
  Choisi par balayage de la composition **sur le moteur** (`adaptRecipe`, jamais une
  réplique de ses formules), à raison d'un meilleur R8 par quantité de pois chiches.

  ⚖️ **Un arbitrage explicite, contre la métrique** : la meilleure composition mesurée
  était `pois chiches SECS 35 g + tofu 180 g` → **12/12**. Elle a été écartée. Le §6.4 du
  brief exige des instructions cohérentes avec la pesée, et **35 g de pois chiches secs ne
  se cuisinent pas en 25 minutes** — personne ne fait tremper 35 g la veille. La version
  en conserve rend **11/12** et se cuisine telle qu'elle est écrite. ➡️ **Une recette
  qu'on ne peut pas suivre est un mensonge de la même famille qu'un chiffre faux** ; le
  point de R8 se paie, l'instruction impossible non.

  📏 **Un instrument ajouté au passage : la MARGE.** Le R8 seul choisit des compositions
  posées sur une falaise — à riz 50 g la recette sert 12/12, à riz 55 g elle tombe à 10/12,
  et la cellule limite passait à **1 kcal** du seuil des +12 %. Un optimum sans marge
  retombe au premier changement de moteur (et « les chiffres R8 bougent quand le moteur
  change » est déjà écrit trois fois ici). La composition retenue a **17 cellules sur 24
  au-delà de 2 % de marge et 9 au-delà de 5 %**, le même profil que `rep277`, une 12/12
  du catalogue.

  📊 **Résultats, tous re-mesurés avant/après sur le même code** :

  | | avant | après |
  |---|---|---|
  | drapeaux bloquants sur 10 752 repas servis | **1** | **0** |
  | `rep10` — profils servis (pire créneau) | 4/12 | **11/12** |
  | repas complets sous le seuil R8 | 72/280 | **71/280** |
  | moyenne R8 du repas complet | 8,58 | **8,61** |
  | repas servis venant d'une recette sous le seuil | 633 (5,9 %) | **611 (5,7 %)** |
  | vivier `repas_complet · H 110 masse · vegan+SG` | 24 rec. / 21 fam. | **25 / 22** |
  | écart calorique moyen du jour | 0,3450 % | 0,3459 % |
  | quasi-doublons (max) | 10,0 % | 10,0 % |

  L'écart calorique bouge de neuf dix-millièmes de point : `rep10` est servie plus souvent
  qu'avant, rien de plus. `npm run mesure:variete` l'arrondit à 0,34 → 0,35 %, d'où cette
  ligne — **le contrôle n'affiche que deux décimales, ne pas lire une dégradation là où il
  n'y a que l'arrondi.**

  🔒 **Le cliquet anti-doublons a été RESSERRÉ** (`lib/__tests__/doublons.test.ts`) :
  R1 85 → 81, R2 75 → 70, R4 16 → 14, R5 18 → 16. Les plafonds n'avaient pas bougé depuis
  le 2026-07-29 alors que B7 → B9 avaient fait descendre les compteurs — le garde-fou
  gardait **4 à 5 points de mou sur chaque règle**, donc une vague pouvait ajouter quatre
  clones sans faire rougir un test. ➡️ **Un cliquet ne se resserre pas tout seul :
  descendre le plafond fait partie du nettoyage.**

  ⚠️ **Ce que D20 ne règle PAS, et qui est réel** : les **16 autres recettes aux pois
  chiches** pèsent la légumineuse SÈCHE (`basis: "dry"`, 350 kcal/100 g) tout en écrivant
  des instructions qui la font mijoter 12 à 20 minutes — cuisson impossible à sec. Qui
  utilise une conserve mange **un tiers** des calories annoncées. `rep10` est désormais la
  seule recette du catalogue à employer `pois_chiches_conserve`, et c'était le bon choix
  pour elle ; l'incohérence des 16 autres est un chantier à part, pas une retouche à
  glisser ici. Elle touche les 22 `ref` pesées SEC, pas seulement les pois chiches.
  ➡️ **C'est D21, juste en dessous — livré le même jour, et il y en avait 47, pas 16.**

- ~~**D21 · La pesée SÈCHE contre les instructions — 47 recettes, et aucun contrôle**~~
  ✅ **LIVRÉ le 2026-08-03.** Le chantier que D20 avait vu et mis de côté. **47 recettes
  sur 512 (9 %)** employaient une légumineuse à cuisson longue déclarée `basis: "dry"`
  avec un `temps_min` sous 40 minutes : une cuisson impossible à sec, trempage non
  compris. Qui suit l'instruction ouvre une conserve.

  📉 **Ce que ça coûtait, mesuré sur les valeurs du moteur** (et pas sur le repère manuel
  du JSON, cf. la leçon du 2026-08-01) : **130 kcal annoncées en trop par recette en
  moyenne, jusqu'à 209** (`rep112`) — soit **7 % à 35 % de l'assiette**, et jusqu'à 14 g
  de protéines fantômes. Les instructions elles-mêmes se répartissaient en trois cas :
  31 disaient « mijoter/cuire », 14 étaient muettes, et **2 disaient déjà « cuits » ou
  « égouttés » tout en pesant sec** (`rep144`, `pd42`). Le pire : `col77` écrivait noir
  sur blanc « fais tremper la veille, puis cuis 50 minutes » sous un `temps_min` de
  **12**.

  🧭 **Le fait qui a décidé de l'arbitrage, et qui n'était pas évident** : `temps_min`
  **ne filtre plus rien** depuis le 2026-07-29 (`lib/planEngine.ts`, et
  `scripts/mesure-couverture.ts` le force à 10). Il n'est plus qu'**affiché** sur la
  fiche. Donc l'option « garder la pesée sèche et dire la vraie durée » ne coûtait
  **rien** sur R8, le vivier ou la variété — elle coûtait un houmous à 8 h de trempage et
  42 repas du soir infaisables en semaine, contre le §6.6 du brief. ➡️ **Avant de choisir
  entre deux corrections, vérifier lequel des deux champs le moteur lit vraiment.**

  ⚖️ **Tranché par le fondateur : l'HYBRIDE.** 44 recettes passent sur un `ref` prêt à
  consommer ; **3 gardent la pesée sèche** parce que la cuisson longue EST le plat et
  qu'aucune ne demande de trempage (`rep107`, `rep108`, `rep112`) — seul leur `temps_min`
  mentait, il passe à 50 min. C'est la ligne de D20 appliquée en grand : *une recette
  qu'on ne peut pas suivre est un mensonge de la même famille qu'un chiffre faux.*

  🔧 **Comment les quantités ont été converties, et pourquoi ce n'est pas un réglage** :
  facteur = **rendement de cuisson** (×2,4 pois chiches, ×2,5 haricots et lentilles),
  arrondi au pas de 5 g du moteur. La portion dans l'assiette ne bouge pas ; seules les
  macros suivent la réalité. Aucune quantité n'a été retouchée pour flatter le R8 — c'est
  la leçon « optimum sur une falaise » du 2026-08-03 appliquée en amont.

  ➕ **Deux `ref` ajoutés** : `haricots_blancs_conserve` (Ciqual **20511**, mappé) et
  `haricots_noirs_conserve` (**valeur manuelle** : Ciqual n'a AUCUNE entrée haricot noir,
  ni sèche ni appertisée — la valeur est déduite du rapport sec → appertisé mesuré sur le
  haricot rouge, 20525 → 20524). Le catalogue n'a donc eu besoin d'**aucune source
  tierce** : tout le reste était déjà dans la base Ciqual locale.

  📊 **Résultats, tous re-mesurés avant/après sur le même code** :

  | | avant | après |
  |---|---|---|
  | recettes dont la pesée contredit les instructions | **47** | **0** |
  | kcal annoncées en trop, par recette | 130 (max 209) | **0** |
  | moyenne R8 — repas complet | 8,61 | **8,67** |
  | moyenne R8 — collation | 6,72 | **6,91** |
  | moyenne R8 — petit-déj | 8,55 | 8,54 |
  | sous le seuil R8 — repas complet | 71/280 | **69/280** |
  | sous le seuil R8 — collation | 7/110 | **5/110** |
  | recettes sous le seuil, toutes catégories | 115 | **111** |
  | quasi-doublons (max) | 10,0 % | **9,2 %** |
  | écart calorique moyen du jour | 0,35 % | **0,34 %** |
  | drapeaux bloquants sur 10 752 repas servis | 0 | **0** |
  | anti-doublons R1 · R2 · R4 · R5 · R7 | 81 · 70 · 14 · 16 · 0 | **inchangés** |
  | fibres/1 000 kcal — sèche vs maintien | 22,53 / 13,19 | **22,77 / 13,30** |
  | vivier `repas_complet · H 110 masse · vegan+SG` | 25 rec. / 22 fam. | **26 / 23** |
  | pire cellule du vivier (`collation · F 55 sèche · vegan+SG`) | 9 rec. / 8 fam. | **10 / 9** |

  ⚠️ **Le seul chiffre qui se dégrade, et il faut le lire correctement** : les repas
  servis venant d'une recette sous le seuil passent de **611 (5,7 %) à 641 (6,0 %)**,
  alors même que le NOMBRE de recettes sous le seuil baisse (115 → 111). Ce n'est pas une
  contradiction : les rescapées sont servies plus souvent qu'avant. **Les deux indicateurs
  ne mesurent pas la même chose**, et celui-ci est le seul qui compte le service réel.

  ⚠️ **Le R8 par recette bouge sur 117 recettes dont 96 QUE PERSONNE N'A TOUCHÉES.**
  `ciblesDe` reconstruit les cibles depuis les repas réellement servis : changer 47
  recettes déplace les cibles, donc le score de tout le monde. ➡️ **Un delta de ±1 sur une
  recette isolée est du bruit ici** ; seuls les franchissements de seuil se lisent. Bilan
  net : **8 recettes repassent au-dessus, 4 tombent** (`rep17` 9→7 est la seule touchée ;
  `rep58`, `col22`, `col103` sont des effets de bord).

  💸 **Ce que la vérité coûte, assumé** : les pois chiches en conserve sont **moins denses
  en protéines** que secs (5,49 contre 5,86 g de protéines pour 100 kcal). Les recettes
  dont ils sont l'ancre principale perdent 1 à 3 profils (`col37` 6→3, `pd20` 6→4,
  `rep142` 7→5). C'est inhérent à l'ingrédient, pas à la conversion : augmenter la
  quantité ne change pas une densité. Ces recettes sont les bonnes candidates à une
  réécriture façon D20 — **pas** à un rattrapage de quantité.

  🔒 **LE LIVRABLE PRINCIPAL, c'est le contrôle** (`lib/__tests__/legumineuses.test.ts`,
  6 tests). La règle était écrite dans le brief **depuis toujours** (§6.4, « les
  instructions doivent être cohérentes avec cette pesée ») et 47 recettes la violaient :
  une consigne sans test ne survit pas à la vague suivante. Il refuse désormais (1) un
  `ref` sec à trempage dans n'importe quelle recette, (2) un `temps_min` plus court que la
  cuisson réelle, (3) une instruction qui décrit comme DÉJÀ CUIT un ingrédient pesé sec,
  (4) une instruction qui fait cuire une conserve, (5) un prêt-à-consommer marqué
  `basis: dry`, et (6) **tout nouveau `ref` sec non classé** — ce dernier est le plus
  important : sans lui, le garde-fou ne couvrirait que les données du jour où il a été
  écrit.
  ✅ **Les 6 gardes ont été vérifiés par MUTATION** — on casse le catalogue exprès, un par
  un, et on vérifie que le test rougit. Les 6 rougissent. Un contrôle qu'on n'a pas vu
  échouer ne prouve rien.

  🔎 **Le contrôle a trouvé DEUX recettes de plus, hors des 47** : `rep273` et `rep274`
  faisaient **tremper les fèves la veille** — contre le §6.6 (aucun repos > 10 min) — avec
  un `temps_min` de 45 qui ignorait le trempage. Le même mensonge dans l'autre sens : ici
  les instructions étaient honnêtes et c'était la DURÉE qui mentait. Corrigé en déclarant
  ce que les trois recettes de fèves décrivent réellement : `feves` s'appelle désormais
  **« Fèves sèches décortiquées »** (elles cuisent 40 min sans trempage), et les deux
  étapes de trempage ont sauté. ➡️ Un contrôle écrit pour un défaut en trouve un deuxième
  le jour où on le lance ; c'est le signe qu'il vise le bon endroit.
  ⚠️ **Approximation assumée** : le `ref` reste mappé sur Ciqual 20518 « Fève, sèche »,
  qui est la fève ENTIÈRE. Les macros énergétiques sont les mêmes, mais les **fibres**
  (25 g/100 g) sont surestimées pour une fève décortiquée. Les fibres ne servent qu'au
  nudge et à la rotation par famille, jamais à une macro affichée.

  📌 **Ce que D21 ne règle PAS, et qui est réel** : `tags.objectif` est censé être une
  fonction mécanique des kcal de base (§6.5 du brief) — **189 recettes sur 512 (37 %) ne
  le respectent pas**, et c'est vrai depuis bien avant ce chantier (`recup_jour_repos` :
  149 ; `sport`/endurance : 117). Ces tags-là PILOTENT la sélection. Les recalculer sur
  les 47 seules aurait été arbitraire et aurait pollué la mesure avant/après, donc ils
  n'ont pas été touchés. **C'est un chantier à part, et il est plus gros que celui-ci.** ➡️ **C'est D22, juste en dessous — livré le même jour.**

- ~~**D22 · Les tags qu'on croyait décoratifs — et le champ mort qui a survécu deux fois**~~
  ✅ **LIVRÉ le 2026-08-03.** Le chantier que D21 avait laissé ouvert. Trois champs, trois
  sorts différents — et deux d'entre eux sont **affichés à l'utilisateur**
  (`components/RecipeDetail.tsx`, `app/(tabs)/recettes.tsx`), ce qui n'était écrit nulle
  part et change tout : ce ne sont pas des réglages internes, ce sont des **promesses**.

  🧭 **Le fait qui cadre tout, vérifié avant de toucher quoi que ce soit** : `objectif` et
  `sport` ne servent QUE de **départage** (`needMatch`, `lib/adaptRecipe.ts` — +1 chacun),
  jamais de filtre. Le pool est filtré par créneau + régime + 👎, rien d'autre
  (`poolForWithFlag`). ➡️ **Aucun risque de rétrécir un vivier** ; tout le risque est
  ailleurs, dans la rotation.

  📉 **`tags.objectif` — 192 recettes sur 512 (37 %) contredisaient les calories de leur
  propre recette.** Le §6.5 du brief le dit pourtant « mécanique, depuis les kcal de base.
  Rien d'éditorial ». Ce n'est pas un artefact de source (183 non conformes en calculant
  sur le repère manuel du JSON, 192 sur les macros du moteur) : c'est de la DÉRIVE, et
  elle penche toujours du même côté — **109 des 192 annonçaient plus gros que la recette
  n'est** (59 « prise de masse » qui sont en fait des recettes de sèche). Recalculés
  mécaniquement, sur les macros du MOTEUR.

  ⚖️ **`tags.sport` — la règle a été mesurée puis ÉCARTÉE, et c'est le vrai résultat de la
  fiche.** Le §5 dit « `muscu` par défaut ; `endurance` si les glucides dépassent 55 % ».
  Appliquée aux 512, elle pose `muscu` **partout** — et le départage `needMatch` devient
  **constant, donc inerte**. Balayage complet, sur le moteur :

  | variante | quasi-doublons | drapeaux bloquants |
  |---|---|---|
  | avant le chantier | 9,2 % | **0** |
  | `objectif` ET `sport` mécaniques | **13,3 %** | 1 |
  | idem + `needMatch` désarmé | 7,1 % | **5** |
  | **`objectif` seul, `sport` intact (retenu)** | **7,9 %** | **0** |

  ➡️ **Les tags « faux » de `sport` faisaient office de diversifieur**, et les rendre
  exacts détruisait un mécanisme qui marchait. `objectif` seul améliore TOUT. Deuxième
  leçon, plus dure : **une règle écrite dans le brief peut être mauvaise pour le moteur —
  la mesurer avant de l'appliquer en masse.** (Les variantes « needMatch désarmé » sont
  identiques entre elles : preuve que le terme `sport` était déjà devenu inerte.)

  🪦 **`recup_jour_repos` — SUPPRIMÉ des 512, du schéma et du type. Il avait survécu DEUX
  fois à sa propre mort.** En 2026-06 sa doc disait « stocké, non utilisé » alors qu'il
  pilotait un départage déplaçant 30 à 36 % des repas des jours de repos. Le 2026-07-29 le
  départage a sauté — et le champ est resté, « conservé en données, la fiche pourra
  l'afficher un jour ». Résultat : plus aucun code ne le lisait, donc **plus personne ne
  pouvait voir qu'il était faux sur 152 recettes sur 512**, ni que deux documents en
  donnaient **deux règles de calcul contradictoires** (`≤ 36,6 % glucides ET ≥ 31,5 %
  lipides` dans `BRIEF-GENERATION-RECETTES.md` §4.8, `< 45 % glucides` dans la commande
  générée). ➡️ **Un champ gardé « au cas où » ne se corrige jamais, et son erreur devient
  invisible.** Même sort que `recomp_flag`.

  📊 **Résultats, tous re-mesurés avant/après sur le même code** :

  | | avant | après |
  |---|---|---|
  | `tags.objectif` qui contredit ses kcal | **192 / 512** | **0** |
  | quasi-doublons (max) | 9,2 % | **7,9 %** |
  | drapeaux bloquants sur 10 752 repas servis | 0 | **0** |
  | moyenne R8 — repas complet | 8,67 | **8,72** |
  | moyenne R8 — collation | 6,91 | **7,00** |
  | moyenne R8 — petit-déj | 8,54 | 8,54 |
  | écart calorique moyen du jour | 0,34 % | **0,34 %** |
  | anti-doublons R1 · R2 · R4 · R5 · R7 | 81 · 70 · 14 · 16 · 0 | **inchangés** |
  | sous le seuil R8 — repas complet | 69/280 | 70/280 |
  | repas servis venant d'une recette sous le seuil | 641 (6,0 %) | 675 (6,3 %) |

  ⚠️ **Un test a cassé, et il n'a PAS été assoupli à l'aveugle.**
  `mealProteinFloor.test.ts` bornait le dépassement protéique quotidien à ×1,16 ; il est
  monté à ×1,177. Re-mesuré des deux côtés avant de toucher la borne
  (**`npm run mesure:proteine`**, commande ajoutée pour que le chiffre reste
  re-vérifiable) : sur 21 jours, **la médiane ne bouge pas** (1,083 → 1,083) et la moyenne
  passe de 1,084 à 1,088 — **c'est UN jour sur 21**, pas une dérive. La cause n'est pas le
  plancher (inchangé) : ce gabarit est en prise de masse, et `prise_de_masse` ne décore
  plus 59 recettes trop légères pour le porter, donc `needMatch` oriente enfin
  correctement vers des recettes denses. Borne relevée à 1,18, avec l'ordre de RE-MESURER
  si elle doit remonter.

  🔒 **Le contrôle** (`lib/__tests__/tags.test.ts`, 6 tests, **les 6 vérifiés par
  mutation**) : `objectif` conforme au §6.5 sur les 512 · aucune combinaison interdite ·
  `endurance` et `combats` ne se répandent pas au-delà du constaté (114 et 51) ·
  aucun `tags.sport` vide · **`recup_jour_repos` ne réapparaît jamais**.

  ✅ **TRANCHÉ LE MÊME JOUR — `sport` sort de l'affichage.** 105 recettes montraient
  « Endurance » sans remplir la règle des 55 % de glucides, et le tag était vu par
  l'utilisateur. Trois issues, aucune gratuite : (1) laisser mentir ; (2) appliquer la
  règle et payer **0 → 5 drapeaux bloquants**, c'est-à-dire l'acquis phare de D20 ;
  (3) retirer l'affichage. **Décision du fondateur : la (3)** — `Recipe.sports` reste un
  diversifieur pour `needMatch`, il n'est simplement plus MONTRÉ.
  ➡️ **Un tag qu'on ne montre pas n'a pas à être une promesse.** Coût moteur : **zéro**
  (aucune donnée, aucun score touché — `ENGINE_VERSION` reste donc à 45).
  🔒 Retiré de `components/RecipeDetail.tsx` et `app/(tabs)/recettes.tsx`, `SPORT_LABEL`
  supprimé de `lib/recipeLabels.ts` (celui de `lib/sport.ts`, les sports du PROFIL, reste).
  Verrouillé par un **scan des sources** dans `tags.test.ts`, sur le patron de
  `noAlert.test.ts` : ré-afficher `sports` ou réimporter le libellé fait rougir la suite,
  les deux vérifiés par mutation. Le jour où quelqu'un voudra vraiment l'afficher, il
  faudra **d'abord le rendre vrai** — et le tableau ci-dessus dit ce que ça coûte.
  ⚠️ **Vérification navigateur NON faite** : le port 8090 était pris par une session
  parallèle et `.claude/launch.json` est un fichier suivi que je n'ai pas voulu modifier
  sous elle. À la place, l'invariant visuel qui restait est verrouillé par un test —
  chaque recette a 1 ou 2 objectifs, donc la ligne de tags n'est jamais vide.

### 🧹 E — Dette technique

> 🔴 **LE NUMÉRO SE CHOISIT EN REGARDANT `main` *ET* LES BRANCHES OUVERTES** — le
> 2026-08-10, cette liste a été **renumérotée TROIS fois dans la même journée**. Trois
> sessions parallèles ont pris E26 en même temps : le consentement analytics (#77, mergé
> en premier, garde son numéro), le plancher d'adiposité (#74 → E30–E32), le rangement du
> Profil (#75 → E33–E34). La #78 avait bien vu le problème et sauté à E29 ; les autres
> non.
>
> ⚠️ **Le chantier DÉJÀ MERGÉ garde son numéro.** Renuméroter de l'histoire déjà partie
> est pire que la collision — les commits, les PR et les autres fiches la citent.
> ⚠️ **Et une série qui se cite se déplace EN BLOC** : décaler le seul numéro qui
> collisionne met la fondation *après* ce qui en découle.
> ⚠️ **Le conflit git qui en résulte n'est PAS un conflit de numéros** : les deux
> branches insèrent en tête de cette section, donc git ne sait pas dans quel ordre. La
> résolution est de garder les DEUX blocs, en ordre décroissant — jamais d'en choisir un.

- 🤖 **E51 · Les transitions : six endroits où l'app téléportait (2026-08-15)**

  Le fondateur : *« fais un check de toutes les animations, ou là il faudrait des
  petites animations — ça va fluidifier les transitions de l'app. »*

  **La retenue de la passe mouvement (E35) n'est pas annulée, elle est précisée.**
  « Les 48 fichiers muets restent muets » visait le fait d'animer pour animer. Ce
  qui manquait est une classe précise, et elle n'avait jamais été balayée : les
  moments où la **mise en page change d'un bloc** sans rien entre l'avant et
  l'après. Six retenus, sur toute l'app — détail, valeurs et rejets en CLAUDE.md §8.

  🔴 **LE PLUS GROS LEVIER N'ÉTAIT PAS UN ÉCRAN, C'ÉTAIT UN COMPOSANT** :
  `Segmented`, **17 sélecteurs**, dont tous ceux de la feuille Réglages. Son fond
  en accent sautait d'une case à l'autre — donc les options se lisaient comme des
  boutons indépendants, pas comme les cases d'un même rail.

  🔴 **ET LE PIÈGE ÉTAIT DANS LA COULEUR DU TEXTE, PAS DANS LE MOUVEMENT.** Faire
  glisser le curseur en gardant la bascule instantanée du libellé
  (`on ? onAccent : textSecondary`) donne, pendant tout le trajet, un texte
  couleur-sur-accent posé sur le rail SOMBRE : illisible ~300 ms, précisément sur
  l'option qu'on vient de choisir. Une seule valeur animée pilote donc la position
  du curseur ET les N teintes. *Ça ne se voit pas en écrivant l'animation — ça se
  voit en la regardant.*

  🔴 **UNE DÉCISION DE GOÛT RENVERSÉE PAR LA MESURE.** La bulle de la visite guidée
  avait été laissée immobile sur un raisonnement juste (l'anneau est le même objet
  qui voyage ; la bulle est un contenu qui change, la faire glisser mentirait).
  Relevé à 30 i/s sur vidéo : l'anneau rendait une fenêtre de mouvement de 200 ms,
  la bulle un **saut d'une seule image, pic 25,5**. La transition claquait quand
  même — la bulle est le plus gros objet de l'écran. Elle se pose désormais en
  fondu, sans se déplacer : **pic 25,5 → 12**. ➡️ *Le raisonnement disait « pas de
  déplacement » et il avait raison ; il ne disait rien de « pas de transition ».*

  ✅ **MESURÉ AU SIMULATEUR, PAS JUGÉ À L'ŒIL.** Deux instruments, tous deux
  reproductibles : (1) `recordVideo` + `ffmpeg -vf fps=30` + différence moyenne
  entre images consécutives — une traînée de plusieurs images = un glissement, un
  pic isolé = un saut ; (2) pour une position précise, le centre de la zone claire
  image par image — le curseur du `Segmented` rend trois positions de repos
  (244 · 602 · 960 px) **et deux positions intermédiaires** (774, 519), ce qui
  prouve le glissement sans rien supposer.
  ⚠️ **Le pilotage du simulateur reste cassé de trois façons** (MCP crashé,
  AppleScript sans droit de clic −25204, lien profond bloqué par un dialogue
  système) : les gestes ont été déclenchés par des **sondes temporaires** posées
  dans le code, puis retirées. `initialRouteName` n'a AUCUN effet sur les onglets
  d'expo-router — mesuré, deux fois.
  ⚠️ **Non vérifiés à l'écran** : le repli des rayons du Frigo, les trois listes à
  paliers, la jauge des Courses et « J'ai cuisiné » — même mécanisme
  (`animerMiseEnPage`), mais leurs écrans sont hors d'atteinte sans taps. À
  regarder au prochain build. ⚠️ **Point d'attention nommé** : `LayoutAnimation`
  sur la `FlatList` des Recettes (512 entrées, virtualisée) est le seul des six où
  le risque de scintillement au recyclage existe.

  🔴 **ET UN GARDE-FOU A ROUGI SUR UN CORRECTIF CONFORME — LA QUATRIÈME FOIS.**
  `visiteGuidee.test.ts` exigeait littéralement `const rayonAnneau =` et trois
  occurrences de ce nom. Rendre l'anneau animé (le rayon voyage avec la position)
  l'a fait échouer. Rebasé sur l'invariant : **une seule source de rayon, et les
  deux géométries la lisent**. ➡️ Et le rebasage a PAYÉ : il a trouvé que l'ancien
  calcul survivait en double, devenu inerte — *une copie inerte est exactement ce
  qui redevient fausse un jour.*

  ➡️ `components/Mouvement.tsx` (`animerMiseEnPage`, `Jauge`). 5 mutations,
  5 rougissements. 1557 tests, `tsc` verts.

- 🤖 **E50 · Le tuto désignait l'objet d'une AUTRE bulle (2026-08-15)**

  **Signalé par le fondateur, sur deux captures de l'onglet Plan** : *« bug sur le
  tuto, regarde les screens. Vérifie toutes les pages des tutos et corrige ce qu'il
  y a à corriger. »* Deux symptômes distincts, et un troisième trouvé en cherchant.

  | capture | ce qu'on lit | ce que l'anneau entoure |
  |---|---|---|
  | 5/6 « Marque-le comme cuisiné » | tape « J'ai cuisiné » | **« Ma répartition (%) »** |
  | 3/6 « Mangé hors plan ? » | déclare un écart ici | le bon bouton, **72 pt trop bas** |

  🔴 **1. « ENREGISTRÉE » N'EST PAS « MONTÉE ».** `useTourTarget` appelle `register`
  depuis le CORPS du composant : l'id entre dans la table dès que le composant vit,
  que l'élément visé soit rendu ou non. `startTour` filtrait sur
  `refs.current.has(id)` — donc `plan-cook` était « disponible » alors que le bouton
  « J'ai cuisiné » n'existait pas (journée entièrement mangée, 2825/2843 sur la
  capture). La mesure échouait après ses essais, et **`rect` n'était jamais remis à
  zéro entre deux étapes** : l'anneau de l'étape précédente restait, sous le texte
  de la nouvelle. Deux défauts qui se cachaient l'un l'autre, comme pour l'anneau
  carré d'E42.
  ➡️ La disponibilité se juge sur `.current`. Et **côté écran** : `plan-cook` était
  accroché au repas d'INDICE 0, alors que `MealCard` ne rend ses boutons que sur un
  repas encore à faire — la cible disparaissait dès le petit-déjeuner coché, même
  quand le dîner juste en dessous les affichait toujours. Elle suit désormais
  `premierCuisinable`.

  🔴 **2. UN DÉLAI DEVINÉ DÉCIDAIT QU'UN DÉFILEMENT ÉTAIT FINI.** `scrollIntoView`
  lançait un `scrollTo` **animé** puis mesurait 260 ms plus tard. Quand l'animation
  dure plus longtemps, la lecture tombe **en plein vol** : bon élément, bonne
  taille, mauvaise hauteur. ➡️ On n'invente plus de durée — deux lectures identiques
  d'affilée valent « l'écran s'est arrêté » (`lib/visee.ts::memeCadre`). Et on ne
  défile plus du tout quand la cible est déjà sous les yeux (`dejaVisible`), ce qui
  supprime 260 ms d'attente par étape — la fenêtre pendant laquelle l'anneau d'avant
  traînait.

  🔴 **3. ET LE PIRE N'ÉTAIT SUR AUCUNE DES DEUX CAPTURES : UN TUTO QU'ON NE POUVAIT
  PAS QUITTER.** Le rendu était `rect ? <Spotlight> : <voile sombre>`. Tant que la
  cible n'était pas mesurée — et **à jamais** si elle ne l'était pas — l'utilisateur
  voyait l'écran assombri **sans bulle, donc sans « Passer »**. Le panneau avale les
  taps, barre d'onglets comprise (c'est voulu, et `startTour` compte dessus) : plus
  aucune sortie, il faut tuer l'app. Et comme le tour est marqué vu à l'OUVERTURE,
  **ça n'arrive qu'une fois** — donc c'est irreproductible par construction, la pire
  forme de défaut. ➡️ Trois états au lieu de deux : on cherche (sombre), on a trouvé
  (spotlight), on renonce (**la bulle sans anneau**, qui garde sa sortie).
  ⚠️ Ce n'est PAS E45 — la luminance de la capture du fondateur l'avait déjà écarté,
  et ce raisonnement reste juste. C'est un piège voisin, que personne n'avait signalé.

  **Les cinq tours ont été revus, comme demandé.** Toutes les cibles sont montées sans
  condition **sauf trois familles**, toutes « premier élément d'une liste » :
  `plan-cook`/`plan-actions`, `courses-article`, `recettes-carte`/`recettes-favori`.
  Elles ne laissent plus un anneau menteur — l'étape est écartée, et si plus AUCUNE
  cible n'est montée le tour ne démarre pas du tout (donc il n'est pas marqué vu : il
  se rejouera quand l'écran aura de quoi le porter).

  ✅ **VÉRIFIÉ AU SIMULATEUR** (iPhone 17 / iOS 27), Metro servant ce worktree via
  `EXPO_ROUTER_APP_ROOT` : les 6 étapes du Plan, chaque anneau sur sa cible ; puis le
  cas EXACT du fondateur, reproduit en marquant les repas mangés dans AsyncStorage —
  petit-déjeuner mangé → la cible suit jusqu'au déjeuner, l'écran défile, l'anneau est
  juste ; journée entière mangée → le tour passe à **4/4** et se termine proprement.
  ⚠️ **Les quatre autres tours n'ont PAS été rejoués à l'écran, et voici pourquoi** :
  le MCP de pilotage du simulateur a crashé, AppleScript n'a pas le droit de cliquer
  (erreur -25204), et le lien profond ouvre un dialogue système qu'on ne peut pas taper
  non plus. Ils partagent le même moteur, et leurs cibles ont été relues une par une.
  🔴 **Deux pièges d'instrument, chacun payé** : `xcrun simctl io screenshot` est
  **rapide** ici — 14 captures d'affilée ont tenu dans 3 secondes, donc toutes dans la
  même étape, et le tour a paru « bloqué au 2/6 ». *(La note « une capture met plus de
  2,4 s » d'E44 portait sur un AUTRE outil : ne pas la généraliser.)* Et le test qui
  découpe `startTour` se bornait sur `'\n  }, []);'`, c'est-à-dire sur la **liste de
  dépendances** d'un `useCallback` — ajouter une dépendance l'aurait cassé **en
  silence** (la recherche serait tombée sur le `useCallback` suivant). Troisième fois
  que cette famille fige la FORME du code au lieu de son invariant.

  ➡️ Décisions extraites en pur : **`lib/visee.ts`** (`dejaVisible`, `memeCadre`,
  budget de recherche), testé par `visee.test.ts`. Câblage relu par
  `visiteGuidee.test.ts`. **7 mutations, 7 rougissements.**

- 🤖 **E49 · La feuille du suivi du poids : trois choses au lieu d'une (2026-08-14)**

  Le fondateur : *« j'aime les fonctionnalités, mais c'est pas ergonomique. »* Plutôt
  que de proposer une refonte à l'aveugle, quatre questions lui ont été posées. Ses
  réponses, parce qu'elles valent plus que le correctif :
  · il vient **enregistrer une pesée** (pas lire, pas corriger) ;
  · ce qui l'irrite : **la rangée de dates**, **trop de choses ensemble**, **la
    courbe trop bas** — et PAS la position du bouton, qu'on aurait juré coupable ;
  · le rappel de pesée : **« non, dans la roue dentée »** ;
  · la forme : *« soit deux onglets, soit mieux rangé »* — arbitrage rendu.

  🔴 **ARBITRÉ : « MIEUX RANGÉ », ET C'EST UN CHOIX CONTRE L'INTUITION.** Deux
  onglets rangent mieux sur le papier — mais ils mettraient la courbe DERRIÈRE un
  tap, alors que le grief est justement qu'elle est trop loin. Il vient enregistrer
  ET veut voir sa courbe : le bon geste est de les rapprocher, pas de les séparer.
  ➡️ Ranger fort produit ici l'effet des deux onglets sans leur coût.

  **Ce que la feuille est devenue**, dans l'ordre : date (une LIGNE) → poids →
  Enregistrer → confirmation → **courbe** → le facultatif replié (note, photo) →
  historique. **Tout tient sans défiler**, vérifié au simulateur.

  · **La rangée de dates se replie** derrière « Une autre date ». 🔴 Et elle a perdu
    ses **sept jours FUTURS grisés** : trois cases intouchables occupaient la moitié
    du sélecteur — d'où « on ne sait pas où taper ». On pèse aujourd'hui ou on
    rattrape un jour passé, jamais demain. Aujourd'hui est désormais la PREMIÈRE
    case et on remonte le temps : plus rien à centrer, donc `stripRef`,
    `centerOnToday` et l'arithmétique de `CHIP_W` disparaissent. *Du code de
    positionnement en moins est un défaut de positionnement en moins.*
  · **Note et photo se replient** : facultatives, elles séparaient le poids de son
    bouton et poussaient la courbe hors de l'écran.
  · **Le sous-titre passe de trois lignes à une.** Ce qui saute n'est pas faux, c'est
    redondant : « Kyroz réajuste calories, macros et plan » est déjà dit par la
    confirmation, AU MOMENT où ça arrive.
  · **« Rappel de pesée » remonte dans la roue dentée**, avec le rappel quotidien.
    La règle de rangement du Profil s'applique mot pour mot (CLAUDE.md §8) : *ce
    réglage change-t-il ce que Kyroz me SERT ?* Non — il change quand Kyroz me
    PARLE. ⚠️ Le fondateur **ne savait pas qu'il existait** : un réglage rangé au
    mauvais endroit n'est pas seulement mal rangé, il est introuvable.

  ⚠️ **CE QUE LES QUESTIONS ONT CORRIGÉ DANS MON DIAGNOSTIC.** J'avais identifié « le
  bouton Enregistrer est trop bas, il faut passer la note et la photo » comme le
  grief principal — c'est le seul des quatre qu'il n'a **pas** coché. Le correctif
  le règle quand même (le facultatif descend), mais par la bande. ➡️ *Demander coûte
  quatre questions ; supposer coûte une refonte qui déplace le problème.*

- 🤖 **E48 · Le Profil : la série s'efface, le poids prend la place (2026-08-14)**

  Quatre retouches dictées par le fondateur, plus un défaut trouvé en les faisant.

  1. **Le « ? » du tuto est parti de l'en-tête.** ⚠️ La porte de sortie ne disparaît
     pas avec lui : « Revoir les tutos » vit dans la roue dentée, sur ce même écran.
     CLAUDE.md §8 exige qu'un écran à tour garde un recours — il en garde un, il
     change d'endroit.
  2. **La série devient la pastille discrète du Plan** (« 1 j / de série »), à la
     place du « ? ». 🔴 **Conséquence à connaître : le chaînon de 7 jours n'existe
     plus NULLE PART dans l'app** — il avait quitté le Plan le 2026-08-05, il quitte
     le Profil aujourd'hui. `components/StreakProgress.tsx` est supprimé (plus aucun
     lecteur). Le North Star reste MESURÉ et le compteur reste affiché ; c'est sa
     visualisation en sept segments qui part. ➡️ `chainProgress` et `streakMessage`
     survivent dans `lib/streak.ts`, testés : le jour où le chaînon revient, il n'y a
     rien à réécrire.
  3. **La carte du poids est refondue et devient le sujet de l'écran** : le chiffre
     seul sur sa ligne, l'écart dessous, la courbe, et un VRAI bouton pleine largeur
     à l'accent. 🔴 **Au passage, un défaut de mise en page qui datait :
     `width={260}` ÉCRIT EN DUR** — donc un blanc à droite sur tout iPhone récent et
     une courbe minuscule sur iPad. Elle se mesure désormais
     (`useWindowDimensions`, pas `Dimensions.get` : §11).
  4. **Les deux paragraphes entre les macros et le TDEE sont retirés** (modulation
     par volume, plancher de sécurité). ⚠️ **Ce qu'on a troqué** : le second
     répondait à « pourquoi ma cible ne bouge plus quand je change mes réglages ? »,
     et son absence fait lire une cible bornée comme un moteur en panne — c'est le
     motif écrit dans CLAUDE.md §6 le jour où il a été ajouté. Les deux survivent en
     entier dans **Méthodologie & sources**.

  🔴 **LE DÉFAUT TROUVÉ EN CHEMIN — les pesées ne se DIFFUSAIENT pas.**
  `useWeightLog` gardait ses points dans l'état LOCAL du hook, et ce hook a TROIS
  instances (Profil, Plan, `WeightCheckin`). Vu à l'écran : on enregistre une pesée
  du 12 août dans la feuille, **la courbe s'affiche dedans**, et la carte du Profil
  continue d'annoncer « encore une pesée et ta courbe apparaît ici ». Indéfiniment.
  ⚠️ **Ce qui l'a fait vivre : le défaut ne se voit que sur un BACKFILL.** Une pesée
  du JOUR modifie `profile.weight_kg`, donc l'effet du hook se redéclenchait par la
  bande et tout paraissait sain. Une pesée d'un jour passé ne touche pas le profil —
  à dessein — et là plus rien ne rafraîchissait rien. Encore un défaut dormant que le
  chemin courant masquait.
  ➡️ Store hors React + `useSyncExternalStore`, le patron écrit dans CLAUDE.md §11
  **depuis le 2026-08-06** et que le thème, l'accent, l'hydratation, le prénom et
  l'heure de rappel suivaient déjà. L'API du hook ne change pas d'un caractère —
  c'est ce qui permet de corriger les trois écrans sans en toucher aucun.
  ⚠️ *Une règle écrite ne s'applique pas toute seule à ses voisins* : celle-ci était
  au bon endroit, illustrée par trois cas, et un quatrième vivait à côté sans
  personne pour le voir. ➡️ Garde-fou : `lib/__tests__/diffusion.test.ts`.

  ✅ Vérifié au simulateur, les cinq points, capture à l'appui.

- 🤖 **E47 · « Cuisiné » depuis le Frigo cuisinait ce qu'on n'avait pas choisi (2026-08-14)**

  Signalé par le fondateur avec une **capture vidéo** — *« voici ce que ça fait quand
  je cuisine des recettes depuis le frigo »*. Le fichier étant dans un dossier protégé
  par macOS (Photos), il était illisible : le geste a été **rejoué au simulateur**, et
  il a rendu deux défauts qui se cachaient l'un l'autre.

  🔴 **1. LA LISTE REMONTAIT SOUS LE DOIGT.** Cuisiner déduit les ingrédients, donc la
  recette quitte les réalisables — et tout le dessous monte d'un cran. Le bouton
  suivant arrive **exactement** là où le doigt vient de se poser.
  **Mesuré : QUATRE appuis au MÊME pixel ont cuisiné QUATRE recettes différentes**,
  frigo 35 → 28 aliments, prêtes 19 → 15. Aucune n'était choisie, et la déduction est
  irréversible (ni confirmation, ni annulation — c'est un choix documenté).
  ⚠️ **L'effet dépasse la recette touchée** : le premier appui a fait tomber la liste
  de 19 à 17, parce qu'une AUTRE recette avait perdu un ingrédient au passage. Retirer
  seulement la carte pressée n'aurait donc rien figé — c'est l'ORDRE entier qu'il faut
  tenir.
  ➡️ `lib/pantry.ts::listeStable` gèle l'**ORDRE**, jamais le **CONTENU** : chaque carte
  garde sa place, son état est relu à chaque rendu. Une recette devenue infaisable
  reste où elle est **et le dit**. Geler le contenu aurait affiché « réalisable
  maintenant » sur une recette dont on venait de manger le riz — le mensonge de §10.
  ⚠️ Le gel se pose au **PREMIER geste**, pas au montage : tant qu'on n'a rien cuisiné,
  un article ajouté doit débloquer ses recettes tout de suite. Le dégel se fait **en
  revenant sur l'onglet**, jamais sur un minuteur deviné.
  ⚠️ Et la recette cuisinée porte un **instantané** : la déduction peut vider son
  dernier ingrédient, `cookableRecipes` ne la rend alors plus du tout, et la carte
  qu'on vient de toucher s'évaporerait — le trou refermant la liste sous le doigt,
  c'est-à-dire le défaut qu'on corrige.
  ✅ Vérifié au simulateur : la carte reste en place, atténuée, « ✓ Cuisiné » à la
  place du bouton — et **deux appuis de plus au même pixel ne font plus rien** (26
  aliments, 12 prêtes, inchangés).

  🔴 **2. LE BANDEAU DE CONFIRMATION ÉTAIT DESSINÉ DERRIÈRE LA BARRE D'ONGLETS.** Posé
  à `bottom: 28` alors que la barre **flotte** au-dessus du contenu depuis la passe
  matériaux (§8, `Fond.barreOnglets = 120`). Le seul retour qui disait CE QUI venait
  d'être cuisiné n'était lisible que comme une tache floue derrière le verre.
  ⚠️ **Le même style, recopié à l'identique dans `plan.tsx`** (« J'ai cuisiné ») : une
  faute, deux écrans, jamais vue — « un style recopié partout est un rôle qui n'a pas
  de nom » (§8), cette fois sur le seul retour d'un geste sans confirmation.
  ➡️ Les deux se renforçaient : rien ne confirmait le geste, **donc on retapait** — et
  le second appui cuisinait autre chose.

  🔴 **ET L'INSTRUMENT A FAILLI ME FAIRE PUBLIER UNE ERREUR.** `xcrun simctl io
  screenshot` met plus de 2,4 s à capturer sur cette machine : **le bandeau était déjà
  parti à chaque prise**, et j'en ai d'abord conclu qu'il ne s'affichait pas du tout.
  Une sonde (`console.log`) a montré que `flashToast` était bien atteint, puis une
  seconde (durée portée à 60 s) l'a rendu visible. C'est seulement là que la vraie
  mesure a pu se faire, dans les deux sens : à `bottom: 28` on lit son fantôme flou
  sous « Courses / Frigo / Recettes » ; à `Fond.barreOnglets` il est net, au-dessus.
  ➡️ **L'ABSENCE SUR UNE CAPTURE NE PROUVE RIEN QUAND CE QU'ON CHERCHE DURE MOINS
  LONGTEMPS QUE LA CAPTURE.** Même famille que `requestAnimationFrame` qui ne tourne
  pas dans le panneau navigateur (§11) : la mesure était juste, l'instrument non.

  ➡️ Garde-fou : `lib/__tests__/cuisinerDepuisLeFrigo.test.ts` (11 cas, **5 mutations**),
  dont un compteur général — **aucun `position: absolute` ancré en bas d'un écran
  d'onglet ne descend sous `Fond.barreOnglets`**. C'est ce compteur qui aurait trouvé
  les deux bandeaux sans qu'on ait à les chercher.

- 🤖 **E46 · Trois listes qui étaient des murs — le Frigo se replie, les recettes se dévoilent (2026-08-14)**

  Décision fondateur, sur captures : le Frigo affichait **69 aliments** d'un bloc et
  **185 recettes prêtes** à la suite ; l'onglet Recettes servait **512 cartes**. Trois
  listes qu'on ne parcourt pas — on les subit.

  **1. Le stock du Frigo se replie par rayon.** Tap sur « PRODUITS LAITIERS & ŒUFS »
  et le rayon se ferme, le compte reste visible. **Ouvert par défaut**, sur sa
  demande — un inventaire qui s'ouvre fermé cache ce qu'on vient vérifier.
  ⚠️ On mémorise les rayons **FERMÉS**, pas les ouverts : un ensemble vide porte le
  défaut sans qu'aucune ligne ne l'initialise, et un rayon qui apparaît (un premier
  produit laitier acheté) est ouvert d'office, sans que rien n'ait à y penser.
  ⚠️ **NON persisté, et c'est une décision** : c'est un pli de lecture, pas un
  réglage. Le stocker imposerait le patron des valeurs d'appareil (CLAUDE.md §11,
  store externe + `useSyncExternalStore`) pour un état qui ne survit à rien — et le
  frigo se rouvrirait à moitié replié sans que personne se souvienne de l'avoir
  demandé.

  **2. Les deux listes « À cuisiner » se dévoilent par 8**, la troisième **par 10**
  (`lib/revelation.ts`, pur et testé ; `ui.tsx::BoutonRevelation` pour le rendu).
  Séquence dictée : *10 · voir + · 10 · voir + · voir tout*. Trois listes, une seule
  arithmétique — trois copies auraient divergé à la première retouche.

  🔴 **UN PLAFOND MUET EST TOMBÉ AU PASSAGE, et c'est la vraie trouvaille.** Les
  presque-prêtes étaient tronquées à 5 par un `.slice(0, 5)` que **rien n'annonçait**
  — mesuré sur le simulateur après correctif : **202 recettes**, donc **194 qui
  n'existaient nulle part à l'écran**. C'est exactement le « no silent caps » que le
  dépôt s'impose : une liste bornée doit le DIRE. Le bouton dit maintenant « Voir les
  194 restantes ».

  ⚠️ **Deux règles §10 tenues par le libellé, pas par l'intention :**
  · « Voir + de recettes » **ne s'affiche pas** quand le tap révélerait déjà tout le
    reste — il devient « Voir les N restantes ». Un bouton dit ce qu'il fait ;
  · le compteur de l'en-tête Recettes affiche le **total filtré**, jamais la tranche
    visible. Sans ça, un filtre qui trouve 512 recettes en annonce 10, et le chiffre
    change à chaque « Voir + » **sans qu'aucun filtre n'ait bougé**.

  🔴 **ET LES PALIERS SE REMETTENT À ZÉRO QUAND LA LISTE CHANGE** (filtre, recherche,
  catalogue). Sinon le bouton annonce un reste calculé sur l'ancien filtre — le même
  défaut que le compteur, par une autre porte.

  ⚠️ `PALIERS_AVANT_TOUT = 2` est **exporté**, pas enterré dans un `n >= 2` : il porte
  une décision du fondateur, et sans nom il se ferait « simplifier » à la première
  relecture. Au-delà, atteindre la fin de 512 recettes demanderait cinquante appuis.

  **Vérifié au simulateur** (le seul juge, §5) : rayon replié, compte conservé ·
  Frigo 8 → « Voir + » → 16 → « Voir + » → « Voir les 194 restantes » · Recettes
  10 → 20 → 30 → « Voir les 482 restantes » → liste entière, bouton disparu.
  ➡️ Garde-fou : `lib/__tests__/revelation.test.ts` (13 cas), qui fige la séquence
  dictée — elle n'est pas un détail d'implémentation.

- 🔴 **E45 · OUVERT — l'app se fige sur « Rien à acheter », non reproduite (2026-08-14)**

  **Signalé par le fondateur**, avec capture, sur son iPhone (OTA #13) : *« une fois
  que j'ai appuyé sur terminer les courses, je suis arrivé sur l'écran où je n'ai
  rien à acheter et je suis resté bloqué — impossible d'aller sur une autre page
  sans fermer l'app »*. **Vu UNE seule fois.**

  🔴 **NON REPRODUITE, ET C'EST LA PREMIÈRE CHOSE À SAVOIR.** Trois chemins joués au
  simulateur (iPhone 17 / iOS 27), chacun jusqu'à l'écran vide puis tap sur un autre
  onglet — **la navigation répond à chaque fois** :
  1. « Tout cocher » → « Courses terminées » → « Rien à acheter » ;
  2. « Rien à acheter » → « Mes courses passées » → fermeture au glissement ;
  3. cocher 1 article → « Courses terminées » → la question « 34 articles ne sont pas
     cochés » → « Les retirer de ma liste » → « Liste vidée ».
  ➡️ C'est donc une **COURSE**, même famille que la feuille du frigo (E18), elle aussi
  vue une seule fois et jamais rejouée à la main.

  **Ce que le symptôme dit, structurellement.** Écran d'apparence normale + aucun tap
  qui répond, **barre d'onglets comprise** + seul le redémarrage débloque : dans cette
  app une seule chose peut produire ça, une `Modal` restée PRÉSENTÉE mais peinte
  invisible. La barre d'onglets vit sous toutes les modales, d'où sa mort en premier.
  Il y en a **sept** (`grep -rn "<Modal" app components`) : `Sheet`, `ActionSheet`,
  `GuidedTour`, `FirstPlanReveal`, `ReminderOffer`, `StreakCelebration`,
  `BirthdayCelebration`.

  ⚠️ **ÉCARTÉ PAR MESURE — le voile du tuto.** C'était le candidat le plus sérieux :
  `GuidedTour` rend `<View absoluteFill backgroundColor: rgba(0,0,0,0.72)>` quand sa
  cible ne se mesure plus, sans bulle et sans sortie — et sur un fond noir un voile
  noir se devine mal. **La capture tranche** : sous 72 % de noir, tout l'écran serait
  à 28 % de sa luminosité ; or le titre « Rien à acheter » y est blanc plein et le
  double-check vert vif, identiques à mes captures sans voile. ➡️ *Une capture n'est
  pas qu'une illustration : ses NIVEAUX sont une mesure.*
  ✅ **Ce voile SANS SORTIE n'existe plus depuis le 2026-08-15 (E50)** — il rend
  désormais sa bulle, donc son « Passer ». Ça ne rouvre PAS cette fiche et ça ne
  disculpe rien de plus : le raisonnement par la luminance l'avait déjà écarté pour
  CE signalement-ci, et il reste juste. Ce qui change, c'est qu'un piège capable de
  produire exactement ce symptôme — écran figé, barre d'onglets morte, une seule
  fois puis plus jamais parce que `startTour` marque le tour vu à l'ouverture — a
  été fermé au passage, sans avoir jamais été signalé par personne.

  ⚠️ **AUCUN CORRECTIF LIVRÉ, ET C'EST DÉLIBÉRÉ.** Deux durcissements plausibles ont
  été écrits puis **écartés faute de preuve** :
  · donner à `Sheet` le montage paresseux d'`ActionSheet` (`if (!render) return null`,
    E11-bis) — vrai défaut de symétrie entre deux jumeaux, mais **il ne corrige pas un
    `render` bloqué à `true`**, et surtout il change QUAND les enfants se montent :
    c'est exactement le piège E24 (un effet de bord attaché à un montage qui n'a plus
    lieu). `WeightCheckin` et `useWeightLog` sont dans ce cas. À ne pas faire sans
    refaire le tour des hooks concernés ;
  · faire converger `render` sur un minuteur plutôt que sur le rappel d'animation —
    mais le rappel de `Animated.parallel` part AUSSI quand l'animation est interrompue
    (c'est le correctif E18), donc le trou reste à démontrer.
  ➡️ Livrer l'un des deux ferait passer une hypothèse pour un correctif.

  🔴 **SECOND SIGNALEMENT LE MÊME JOUR — et il donne la signature commune.**
  *« j'ai l'écran qui a freeze quand j'ai fermé la feuille du suivi du poids »*.
  Non reproduit non plus : six cycles ouverture/fermeture, dont un glissement
  interrompu à mi-course, tous sains.
  ➡️ **Le point commun des deux est FERMER UNE FEUILLE** (l'écran « Rien à acheter »
  monte lui aussi une `Sheet`, celle de l'historique). Ça ne prouve pas la cause,
  mais ça désigne l'état : une `Modal` de `Sheet` restée PRÉSENTÉE alors que sa
  feuille est animée hors écran — transparente, plein écran, avalant tous les taps,
  et dont le fond appelle un `onClose` qui remet à `false` un état déjà `false`
  (donc React ne re-rend pas, donc rien ne peut plus la fermer).
  ✅ **UN FILET A ÉTÉ POSÉ, ET CE N'EST PAS UN CORRECTIF.** `Sheet` et `ActionSheet`
  démontent désormais au plus tard après `FILET_DEMONTAGE_MS` (1,5 s), sans attendre
  le rappel d'animation. E18 avait retiré la condition `finished` au motif qu'« un
  état qui doit converger ne se confie pas à un événement qui peut ne pas arriver » —
  mais le rappel EST encore un événement, et le raisonnement n'avait pas été poussé
  jusqu'au bout. Inerte dans tous les chemins sains ; dans le chemin pathologique, il
  transforme un gel définitif en accroc d'une seconde et demie.
  ⚠️ **La cause reste INCONNUE.** Ne pas lire ce filet comme une clôture : il rend le
  symptôme survivable, il n'explique rien. Compté par `feuilles.test.ts` — un
  garde-fou qui ne sert dans aucun chemin sain se fait « simplifier » à la première
  relecture.

  **CE QU'IL FAUT FAIRE À LA PROCHAINE OCCURRENCE — et ça se joue en 5 secondes :**
  **glisser vers le bas au MILIEU de l'écran.** Si quelque chose descend, ou si l'app
  redevient vivante, c'est une **feuille invisible restée montée** (`Sheet`) et le
  chantier se referme sur `render`. Si rien ne bouge du tout, c'est le **fil JS** qui
  est bloqué, et le suspect n'est plus une modale mais une boucle de rendu — deux
  familles opposées, que rien d'autre ne sépare. ➡️ Sans ce test, la prochaine session
  refera les trois reproductions ci-dessus pour rien.

- 🤖 **E44 · Les trois finitions — et un SEPTIÈME geste mort trouvé en les vérifiant (2026-08-14)**

  Les trois points d'E43 sont faits, et **vérifiés un par un au simulateur** (c'est
  là qu'ils avaient été vus). Ce qui mérite d'être retenu n'est pas la liste : c'est
  ce que la vérification a trouvé en chemin, et ce qu'elle a corrigé d'une règle
  qu'on croyait acquise.

  **Les trois finitions :**
  1. **La roulette de date a sa marge** (`components/BirthDatePicker.tsx`,
     `padding: Spacing.xxl`). `Sheet` ne pose AUCUN padding horizontal : chacun de
     ses enfants apporte le sien, et c'est ce qui permet à `WeightCheckin` ou
     `RecipeEditor` d'avoir un en-tête fixe margé et un `ScrollView` margé
     séparément. Recensé : sur les **18** composants rendus directement dans un
     `<Sheet>`, **17** portaient déjà `Spacing.xxl` — les sept éditeurs du Profil
     par leur `EditorShell` commun. Celui-là était le dix-huitième, et le seul sans
     rien. ⚠️ **Corriger dans `Sheet` aurait doublé la marge des dix-sept autres.**
  2. **« Point du aujourd'hui » est devenu « Aujourd'hui — point mis à jour ».**
     Même remède que dans `OffPlanHistory` : un tiret, la date devant, sa majuscule
     conservée. « du 5 août » et « d'aujourd'hui » ne prennent pas le même article,
     donc aucune phrase collée ne peut être juste pour les deux.
  3. **Les deux `notify` de la feuille Réglages sont des messages EN LIGNE**
     (`components/MessageEnLigne.tsx`, le pendant de `ConfirmationEnLigne` pour ce
     qui n'appelle pas de réponse). `CHANTIER_DIALOGUES_EN_FEUILLE` est **VIDE** :
     plus aucun composant de feuille n'ouvre de boîte de dialogue, et le tableau vide
     rend le test strict.
     ⚠️ **Pourquoi un composant plutôt qu'un `ConfirmationEnLigne` détourné** : ces
     deux-là n'interrogent pas, ils annoncent. Sans nom pour ce rôle, le prochain
     écran serait retourné à `notify`, c'est-à-dire au défaut. Et il **se ferme** —
     un `notify` a son « OK » ; posé en ligne, un message qui ne part jamais devient
     un morceau d'écran, et le réglage d'à côté se lit comme s'il était en panne.

  🔴 **LE SEPTIÈME GESTE MORT — « Me peser », depuis l'éditeur Informations.**
  Trouvé en allant vérifier la finition 1, sur le chemin. `onWeighIn` faisait
  `setEditor(null); setWeighIn(true);` et **son commentaire affirmait « on ferme
  l'éditeur AVANT d'ouvrir la pesée »**. C'était sincère : les deux setters étaient
  bien écrits dans cet ordre. Mais ils partent dans le **même lot d'état**, et
  `Sheet` garde sa `Modal` montée le temps de son animation de sortie — donc iOS
  voyait arriver la seconde pendant que la première était encore présentée, et n'en
  présentait aucune. **Preuve : deux captures à cinq secondes d'intervalle,
  identiques au bit près, l'éditeur refermé et rien d'ouvert.**
  ➡️ Corrigé par `Sheet.onClosed` + `apresEditeur`, exactement comme « Supprimer mon
  compte » vingt lignes plus haut dans le même fichier.
  ⚠️ **Écrire les setters dans le bon ordre ne ferme pas cette porte** — c'est la
  formulation à retenir, parce que c'est précisément l'illusion qui a produit ce
  défaut-ci.
  ℹ️ Le geste n'était pas perdu (la pesée s'ouvre aussi depuis l'en-tête du Profil et
  depuis le Plan) ; c'est le raccourci qui ne répondait pas.

  🔴 **ET LA RÈGLE D'E42 ÉTAIT TROP LARGE — MESURÉ.** E42 a écrit « iOS refuse de
  présenter une seconde `Modal` quand une autre est en place ». C'est faux tel quel,
  et la roulette de date le prouve : son `<Sheet>` est déclaré **DANS** les enfants de
  la feuille d'édition, et il s'ouvre parfaitement (capture à l'appui) — puis se
  referme et rend la main à l'éditeur.
  ➡️ **Le critère est OÙ la `Modal` est DÉCLARÉE dans l'arbre**, pas « une modale
  est-elle ouverte » :
  · déclarée **à côté** de la première (deux `<Sheet>` frères au niveau de l'écran,
    ou une `Modal` de `DialogProvider` montée à la racine) → les deux demandent à
    être présentées par le **même** contrôleur, le second est refusé → geste MORT ;
  · déclarée **à l'intérieur** de la première → elle est présentée par le contrôleur
    de cette feuille-là, en chaîne → ça marche.
  ⚠️ L'ancienne formulation est **conservatrice** : elle interdit plus que nécessaire,
  donc rien ne casse en la suivant. Mais elle ferait « corriger » du code sain, et
  elle rendrait `ConfirmationEnLigne` obligatoire là où il ne l'est pas. CLAUDE.md §11
  est amendé.
  ➡️ *Une prémisse écrite en corrigeant cinq cas n'a été mesurée que sur ces cinq-là.*

  **Ce qui est vérifié, et comment.** Simulateur iPhone 17 / iOS 27, Metro lancé sur
  le worktree (`EXPO_ROUTER_APP_ROOT=$PWD/app`), app relancée entre chaque lot :
  roulette margée ✓ · « Aujourd'hui — point mis à jour » après une pesée réelle ✓ ·
  « Me peser » ouvre la feuille ✓ · message « Notifications désactivées » sous le
  réglage, avec son « Fermer » qui marche ✓ · message « Aucune application e-mail »
  sous la ligne RGPD ✓.
  ⚠️ **Ce dernier a demandé une SONDE, et il faut savoir pourquoi** : la ligne
  « Supprimer mes statistiques » ne s'affiche que si un identifiant pseudonyme
  existe, or `distinctId()` n'est appelé **qu'après** le test `POSTHOG_KEY` dans
  `capture()`. Sans clé — l'état actuel, analytics dormant — **aucun pseudonyme n'est
  jamais créé, donc cette ligne est INATTEIGNABLE en production aujourd'hui**. Elle
  le deviendra le jour où la clé sera posée (E26). La vérification s'est donc faite
  en forçant l'identifiant le temps d'une capture, puis en le retirant.

  **Garde-fous, tous vérifiés par mutation :**
  · `lib/__tests__/margeFeuilles.test.ts` (nouveau) — tout composant rendu dans un
    `<Sheet>` déclare un `padding`/`paddingHorizontal` à `Spacing.xxl` ;
  · `feuillesEmpilees.test.ts` — chantier vide, `ReglagesSheet` sans `useDialog`,
    fermeture non inerte du message, le cas « Me peser », et surtout un **compteur
    général** : fermer un état de feuille puis en ouvrir un autre dans le même corps
    de fonction est interdit (les fermetures en série restent légitimes) ;
  · `shoppingHistory.test.ts` → « Date lisible » — aucun article collé devant une date
    nommée.
  ⚠️ **La sonde de `feuillesEmpilees` s'est accusée elle-même à la première version** :
  la note qui explique le correctif de « Me peser » cite la ligne fautive mot pour
  mot. Troisième fois que cette famille de test se fait piéger par sa propre
  documentation (compteur d'émojis, puis `ShoppingHistory`) — on lit du CODE, jamais
  de la prose, et `sansCommentaires` est passé sur TOUS les lecteurs du fichier.
  ⚠️ **Ce que la finition 2 n'a PAS reçu, et c'est délibéré** : le compteur d'articles
  ne voit que l'article ACCOLÉ à l'interpolation. La faute d'origine se construisait en
  deux endroits (l'étiquette ici, la phrase là) — une sonde qui lit le source ne peut
  pas la voir sans mentir sur ce qu'elle couvre. C'est écrit dans le test.

  📦 Reste ouvert après cette fiche : **A32** (les 12 silhouettes de masse grasse,
  tâche du fondateur), et la revue page par page, arrêtée après Courses — restent
  Frigo, Recettes et Profil.

- ~~**E43 · Trois finitions vues au simulateur, non corrigées**~~ ✅ **LIVRÉ le
  2026-08-14 → voir E44.** Sorties de la fiche E42 pour qu'elles ne se perdent pas
  dans sa prose : trois chantiers vus sur le build natif, aucun signalé par le
  fondateur, aucun bloquant — c'est pour ça qu'ils n'avaient pas été faits dans la
  foulée, et c'est aussi pour ça qu'ils s'oubliaient.

  1. **La feuille de la roulette de date est DÉCALÉE À GAUCHE.** Le titre « Ta date
     de naissance » et le bouton « Valider » touchent le bord gauche. ⚠️ **Ce n'est
     pas `Sheet`** : la fiche recette, servie par la même feuille, est correctement
     margée sur la même capture. ✅ C'était `BirthDatePicker`, sans aucun padding.
     ℹ️ La fiche disait aussi « ~25 pt de marge à droite » — **c'était une lecture
     approximative de la capture, et elle est fausse** : sans padding, le contenu
     touchait les DEUX bords ; ce qui restait à droite, c'était la fin du texte du
     titre. Une mesure à l'œil sur une capture n'est pas une mesure.

  2. **« Point du aujourd'hui mis à jour ».** Le message de confirmation après une
     pesée colle un article devant une date variable. Même faute que celle déjà
     corrigée dans `OffPlanHistory`, et même remède : un **tiret**. ✅ Fait.

  3. **Les deux `notify` de la feuille Réglages restent des modales dans une
     modale** (« aucune application e-mail », « rappel refusé »). Donc morts sur
     iPhone, comme les cinq d'E42. **Laissés volontairement** à l'époque : purement
     INFORMATIFS, rien ne se perd si l'un ne s'affiche pas — contrairement à une
     confirmation, qui laisse un geste sans réponse. ✅ Devenus des `MessageEnLigne`,
     et `CHANTIER_DIALOGUES_EN_FEUILLE` est **vide**.

- 🤖 **E42 · Revue page par page du Plan et des Courses — et CINQ gestes morts en natif (2026-08-14)**

  Suite d'E41, même méthode : le fondateur dicte écran par écran sur captures.
  Six commits, branche `claude/plan-epure-1ed3ff0`. Les retouches d'écran sont la
  partie visible ; ce qui compte est ce que deux d'entre elles ont déterré.

  **Les retouches, dans l'ordre des écrans :**
  1. **Le titre du Plan est devenu une SALUTATION qui tourne** (`lib/salutation.ts`,
     pur, indexé sur le moment de la journée et sur `dayIndex` — le même compteur
     que les notifications). Le repli « Ton plan » disparaît : il servait un titre
     d'écran à qui n'a pas renseigné son prénom pendant que les autres recevaient
     un bonjour. Un « Bonjour » à 22 h serait un texte faux, donc le créneau se
     calcule. Garde-fou : `salutation.test.ts`, 4 mutations.
  2. **Les lunes de la rangée de jours étaient ROGNÉES** — conteneur de 13 pt pour
     une icône de 16. Ça ne se voit que sur une capture : un croissant tronqué
     reste un croissant plausible.
  3. **Trois chiffres redondants retirés** : « X kcal prévus sur la journée, rien
     de coché », « Cible X kcal · +N », et le compteur à droite de « Repas du
     jour ». Le même nombre trois fois sur un écran où chaque carte porte déjà ses
     kcal. ⚠️ Ce qui reste dit toujours l'écart quand il existe — `SousCibleNote`
     sous la cible, une phrase dédiée au-dessus. Les retirer ferait mentir l'écran
     par omission.
  4. **La carte d'objectif daté quitte le Plan** (elle reste au Profil). Cet écran
     répond à « qu'est-ce que je mange aujourd'hui » ; le rendez-vous avec la
     trajectoire est le rappel de pesée.
  5. **Le nom d'une recette a sa propre ligne** : les quatre boutons ronds
     mangeaient 200 pt sur 390, un nom à rallonge tombait sur CINQ lignes.
  6. **Historique des courses** : une seule phrase en tête, pied de page retiré.
     ⚠️ La purge à six mois qu'il annonçait TOURNE TOUJOURS — la phrase part, pas
     le comportement.
  7. **Tuto** : `TourStep.forme` remplace `rayon` — voir plus bas.

  🔴 **LE TROU DU SURLIGNAGE ÉTAIT CARRÉ, ET SON RAYON NE SERVAIT À RIEN.** Deux
  défauts qui se cachaient l'un l'autre. (a) L'assombrissement se faisait par
  QUATRE panneaux rectangulaires : le vide qu'ils laissaient ne pouvait pas être
  arrondi, donc aux quatre coins une pointe d'écran restait **en pleine lumière**
  hors de l'anneau. (b) `TourStep.rayon`, ajouté deux jours plus tôt avec sa doc et
  son calcul, **n'était renseigné par AUCUNE des 21 étapes** : toutes retombaient
  sur le rayon de carte, donc l'anneau dessinait une carte autour d'un bouton.
  ➡️ Un SEUL panneau, dont la BORDURE fait l'ombre : le vide intérieur d'une
  bordure épaisse est arrondi du rayon extérieur moins l'épaisseur, donc du même
  rayon que l'anneau **par construction**. Et `rayon: number` devient
  `forme: 'carte' | 'bouton' | 'pastille'`, OBLIGATOIRE, chaque étape portant en
  commentaire la ligne de style qui la prouve. Un NOM et pas un nombre : `tours.ts`
  doit rester pur, donc il ne peut pas importer `Radius` — y écrire 22 aurait
  recopié un token de la DA dans un fichier qui ne le voit pas.
  ⚠️ *Un réglage optionnel que personne ne renseigne est un réglage qui ne pilote
  rien* (A23), et il se re-oublie tant qu'il reste optionnel.

  🔴 **« MÉLANGE WOK (POIVRON/BROCOLI/CAROTTE) » MANGEAIT LES CAROTTES DU FRIGO.**
  Signalé comme « la carotte ne se range pas dans l'historique une fois les courses
  terminées ». `pantry.ts::matches` apparie deux noms par INCLUSION dans les deux
  sens — c'est ce qui permet à un « oeufs » saisi à la main de retrouver les
  « Œufs entiers » d'une recette. Le prix : un nom COMPOSÉ avale le nom simple
  qu'il contient. La soustraction du frigo parcourt les ingrédients dans l'ordre du
  plan, le mélange passait d'abord, et la carotte revenait à chaque recalcul —
  chaque « Courses terminées » archivait UN article, en boucle.
  **Périmètre mesuré** (`npm run mesure:collisions`, nouveau) : **9 couples sur 125
  ingrédients**. Quatre franchement faux — **Pomme ⟷ Pomme de terre**, et Carotte /
  Brocoli / Poivron ⟷ Mélange wok. Cinq sont des variantes du même aliment (Pois
  chiches ⟷ en conserve, Tomate ⟷ concassée) : elles se confondaient « utilement »,
  mais 100 g de secs ne valent pas 100 g d'égouttés — les séparer est un correctif
  aussi, et c'est le seul effet de bord.
  ➡️ `memeAliment()` : quand les deux noms désignent des ingrédients du CATALOGUE,
  c'est leur `ref` qui tranche. Le nom ne sert plus que pour ce que le catalogue ne
  connaît pas — les articles saisis à la main.
  ⚠️ **La `ref` se DÉDUIT du nom, elle n'est pas stockée** : c'est ce qui rend le
  correctif rétroactif. La stocker aurait demandé une migration, les frigos
  existants n'en auraient pas eu, et le bug aurait survécu à son correctif.
  ➡️ Garde-fou : `collisionsIngredients.test.ts` (10 cas, 4 mutations), dont un
  contre-contrôle qui exige que le NOM, lui, confonde bien ses 9 couples — sans
  lui, le test passerait aussi si le frigo cessait de couvrir quoi que ce soit.

  🔴 **CINQ GESTES ÉTAIENT MORTS SUR IPHONE, DONT « SUPPRIMER MON COMPTE ».**
  C'est la vraie récolte de la session, et **elle a demandé un build natif**.
  iOS refuse de présenter une `Modal` par-dessus une `Modal` déjà en place, sans
  erreur ni trace. Or `useDialog()` monte la sienne, et quatre écrans qui
  l'appellent vivent DÉJÀ dans une feuille.

  | Geste | Avant | Correctif |
  |---|---|---|
  | Supprimer mon compte | rien | `Sheet.onClosed` — la confirmation attend le DÉMONTAGE |
  | Personnaliser une recette (crayon) | rien | l'éditeur REMPLACE la fiche dans la même feuille |
  | Retirer de l'historique de courses | rien | `ConfirmationEnLigne` |
  | Supprimer cette pesée | rien | `ConfirmationEnLigne` |
  | Retirer une ligne du journal d'écarts | rien | `ConfirmationEnLigne` |
  | Ajouter une photo de progression | rien | choix de source posé en ligne |

  ⚠️ **CE DÉFAUT EST INVISIBLE AU NAVIGATEUR** — mesuré, pas supposé : sur le code
  d'AVANT, le crayon ouvrait parfaitement l'éditeur dans le panneau web. RNW rend
  une `Modal` en `<div>` et empile sans se plaindre. **C'est ce contraste qui a
  désigné la cause** : composant sain, empilement fautif. Sans lui, le diagnostic
  évident était « l'éditeur est cassé ».
  🔴 **ET E11 AVAIT ÉCRIT L'ANGLE MORT, MOT POUR MOT** : « Mesuré sur le WEB
  uniquement — sur natif, `Modal` est une modale de plateforme… **Non re-testé sur
  iOS.** » La note était juste, elle est restée neuf jours, et personne n'est allé
  voir. *Une inconnue consignée n'est pas une inconnue traitée.*
  ⚠️ **Le sixième n'a été signalé par personne** : le choix appareil/galerie de la
  photo de progression ouvrait une TROISIÈME modale depuis la même feuille. C'est
  le garde-fou en cours d'écriture qui l'a désigné, pas l'écran — *un compteur
  trouve ce qu'une revue ne voit pas.*
  ✅ **Vérifié un par un AU SIMULATEUR** : « Supprimer mon compte ? » ne s'affichait
  pas (deux captures à six secondes d'écart identiques à l'horloge près), elle
  s'affiche maintenant ; le crayon ouvre l'éditeur et « Annuler » ramène à la
  fiche ; le choix de source et « Supprimer cette pesée ? » apparaissent en ligne.
  **Non re-joué** : le journal des écarts (il faut un écart enregistré) — même
  composant, même patron, tests verts, mais je ne l'ai pas VU.
  ➡️ Garde-fou : `feuillesEmpilees.test.ts`. La liste du chantier y est écrite et
  **ne peut que rétrécir**.

  ✅ **LA ROULETTE DE DATE A ENFIN ÉTÉ JUGÉE EN NATIF** (elle attendait depuis
  E41) : elle défile, s'aimante sur la ligne de sélection, et « Valider » écrit la
  date. Le geste vit.

  ⏭ **CE QUI RESTE, vu en passant et non corrigé → fiche E43.** Trois finitions
  repérées sur le build natif ; elles vivent dans leur propre entrée pour ne pas se
  perdre en fin de fiche.

- 🤖 **E41 · Revue page par page de l'onboarding, du reveal et du tuto (2026-08-12)**

  Session de corrections dictées écran par écran par le fondateur, sur captures.
  Neuf commits, branche `claude/corrections-par-page-7a0afb`. Ce qui mérite d'être
  retenu n'est pas la liste des retouches — c'est ce que trois d'entre elles ont
  découvert en passant.

  **Ce qui a changé, dans l'ordre des écrans :**
  1. **L'écran d'avertissement santé est SUPPRIMÉ** (`components/HealthScreening.tsx`
     et `lib/healthScreening.ts` n'existent plus). Depuis E39 il ne posait plus
     aucune question et ne bloquait plus personne : un tap de plus pour deux
     phrases. Elles sont servies **sous le bouton de l'étape 1**
     (`constants/legal.ts::AVERTISSEMENT_MEDICAL` + `DISCLAIMER`).
     ⚠️ « Discret » veut dire petit et gris, **jamais derrière un lien** : Apple
     1.4.1 veut le renvoi visible SUR le parcours. Garde-fou :
     `avertissementMedical.test.ts` (3 mutations).
  2. **Plus aucun prénom réel en placeholder** — « Kévin » valait sur DEUX écrans
     (étape 1 **et** Profil → Prénom, celui qui sert justement à le corriger).
  3. **La date de naissance se choisit à la ROULETTE** (`components/Wheel.tsx`,
     `lib/wheelDate.ts`). Voir les trois points ci-dessous, c'est là qu'est la
     matière.
  4. Sous-titre du %MG raccourci · **les silhouettes sont à refaire** (A32) ·
     textes de la dernière étape allégés · ligne de stats du reveal resserrée.
  5. **Tuto** : la bulle de la série garde sa première phrase, l'anneau de
     surbrillance épouse la forme de sa cible.

  🔴 **TROIS NO-OP WEB, MESURÉS DANS `react-native-web` ET NON SUPPOSÉS.** C'est la
  vraie récolte de cette session, et les trois sont de la famille d'`Alert.alert`
  (§11) : aucune erreur, aucune trace, un écran parfaitement plausible.
  - `onMomentumScrollEnd` et `onScrollEndDrag` **ne sont jamais déclenchés** — RNW
    ne câble au DOM que `onScroll` (`ScrollView/index.js:588`). Une roulette bâtie
    dessus défile, s'aimante… et ne commet **rien**. Sur le web, c'est-à-dire sur
    la version que les testeurs utilisent.
  - `contentOffset` **n'existe pas du tout** dans RNW (0 occurrence). La roulette
    s'ouvrait sur 2026 — un nouveau-né — en ayant l'air de marcher. **Vu à l'écran,
    pas dans le code.**
  - *(Rappel du même jour : `onEndEditing` était déjà connu comme no-op web.)*
  ➡️ Un seul chemin partout : `onScroll` + délai de pose, et `scrollTo` au montage.

  🔴 **UNE ROULETTE N'A PAS D'ÉTAT « VIDE », ET C'EST LA DÉCISION STRUCTURANTE.**
  Elle affiche toujours quelque chose. Posée en ligne dans le formulaire, elle
  aurait soit **enregistré** une date que personne n'a choisie (donc un âge faux,
  donc un BMR faux, en silence), soit **affiché** une date que le moteur n'a pas
  (CLAUDE.md §10). D'où la feuille : la ligne dit « À renseigner » tant qu'on n'a
  pas validé, et le bouton « Continuer » reste atténué exactement comme avec les
  trois champs vides d'avant. Ça coûte un tap ; c'est le prix de l'honnêteté sur un
  champ qui alimente le moteur.

  🔴 **LES ANNÉES MONTENT JUSQU'À L'ANNÉE COURANTE, PAS JUSQU'À `MIN_AGE`.** Le
  geste évident — n'offrir que les années donnant 18 ans — rendrait le hard block
  mineur **inatteignable** : plus personne ne pourrait déclarer son âge réel, donc
  plus personne ne serait refusé, et `checkEligibility::MINOR` resterait vert en ne
  gardant plus rien. Un test le dit nommément.

  ⚠️ **Et le harnais Playwright ne peut plus remplir un placeholder.**
  `choisirDateNaissance` POSE LE DÉFILEMENT (`scrollTop`, donc le vrai `onScroll`)
  plutôt que d'écrire un état — sinon on testerait le harnais, pas l'app. Les
  repères `wheel-*` et le pas de 44 pt recopié dans le script sont verrouillés
  contre le composant (`harnaisEcrans.test.ts`).
  ⚠️ **Le délai supprimé avec l'écran d'avertissement a dû être remplacé** : son
  `isVisible({ timeout })` absorbait le temps de MONTAGE de l'assistant. Sans
  attente derrière, une sonde instantanée conclurait « session déjà onboardée » et
  sauterait l'onboarding **en silence** — la panne exacte que ce harnais existe
  pour rendre visible. D'où `attendreEtape1`, et un test qui l'exige.

  ⚠️ **Un principe écrit pour un cas ne s'applique pas tout seul à son voisin**,
  troisième récidive : la phrase « Kyroz sert un peu moins de calories les jours de
  repos » était conditionnée sur l'écran Plan (2026-08-08) et **pas** à
  l'onboarding, où elle s'affichait à qui venait de cocher « Je ne fais pas de
  sport » deux étapes plus tôt. Corrigé, les deux branches vérifiées à l'écran.

  ⚠️ **Un libellé long peut se retirer sans que son INFORMATION se perde** :
  « kcal en moyenne » est devenu « kcal », et la nuance a changé de PLACE (la
  phrase d'accroche du reveal), pas de statut. La supprimer aurait ouvert la
  relation sur un nombre que le plan juste en dessous contredit.

  ✅ **Vérifié** : 1 463 tests verts, 88 fichiers, `tsc` propre. Chaque écran touché
  a été **regardé en preview**, pas seulement relu — c'est la capture qui a montré
  le `contentOffset` mort, la césure « Recompositi / on » et les deux branches de la
  phrase des jours de repos.
  🔴 **NON VÉRIFIÉ AU SIMULATEUR — et c'est la seule chose qui reste** : la roulette
  est un GESTE, son inertie et son aimantation ne se jugent pas dans le panneau
  navigateur (CLAUDE.md §5). À faire avant de se fier au ressenti.

- 🤖 **E40 · La page « Méthodologie & sources » — et pourquoi elle ne contient aucun chiffre (2026-08-11)**

  Point A4 de la checklist légale, et **le seul de ses points « app » qui restait à
  coder** (les autres sont arbitrés en E39). Apple 1.4.1 exige la divulgation des
  données et des méthodes derrière toute mesure liée à la santé, et rejette en boucle
  les apps nutrition dont les sources restent vagues — y compris celles qui se
  contentent de citer « OMS / EFSA ». Route `/methodologie`, atteignable par
  Profil → roue dentée → Aide et retours.

  🔴 **AUCUN CHIFFRE N'EST ÉCRIT DANS CETTE PAGE — ILS SONT TOUS LUS DANS LE MOTEUR.**
  C'est la décision structurante du chantier, et elle vient d'un précédent mesuré : une
  page de méthodologie est une **affirmation sur le code**, exactement comme une bulle
  de visite guidée — et à l'audit, **trois bulles sur cinq étaient fausses**, chacune
  vraie le jour de son écriture. Un plancher annoncé « 1 200 kcal » en dur survivrait au
  jour où la constante change, et cette page-ci est lue par le relecteur Apple.
  ➡️ `lib/methodologie.ts` (pur, sans import react-native) importe `MIN_KCAL`,
  `EA_HARD_FLOOR`, `MAX_DEFICIT_TDEE_RATIO`, `NEAT_PAL`, `BF_CHART_MAX`,
  `DIET_BREAK_AFTER_WEEKS`, `CIQUAL_ATTRIBUTION`… et interpole. L'écran ne fait que
  rendre. **Corollaire pour la suite : si un chiffre n'est pas importable, c'est qu'il
  n'a pas de source unique — l'exporter d'abord, l'afficher ensuite.**

  **Ce que la page distingue explicitement, et c'est ce qui la rend défendable** : ce
  qui vient de la LITTÉRATURE (Mifflin-St Jeor, Katch-McArdle, valeurs MET, seuil de
  30 kcal/kg de masse maigre du consensus RED-S, fourchettes protéiques ISSN/Helms) et
  ce qui est un CHOIX de Kyroz, prudent par construction (plafond d'activité à 1,45,
  déficit borné à 25 %, pause à la maintenance, retrait des planchers dérivés au-delà du
  seuil d'adiposité). Elle dit aussi, en toutes lettres, que les recettes **ne sont pas
  validées par un diététicien** — `validated_by_dietitian` est `false` en dur, et aucun
  écran n'a le droit de laisser croire l'inverse (CLAUDE.md §6).

  🔴 **LA MUTATION QUI A TROUVÉ LE TROU, et c'est l'apport méthodologique du chantier.**
  Le premier garde-fou retirait du texte toute valeur venant d'une constante et exigeait
  qu'il ne reste aucun chiffre. Vérifié par mutation : changer `MIN_KCAL` à 1 600 laisse
  le test **VERT** — normal, la page suit, c'est le but. Mais la même mesure montre que
  **« 1 500 » tapé à la main passerait aussi**, puisque c'est exactement ce qu'on
  retire : indiscernable d'une interpolation, et faux au premier changement. ➡️ Second
  test : **le NOM de chaque constante doit apparaître dans la source**. Un chiffre
  substitué à son interpolation fait disparaître le nom, et rougir.
  ⚠️ **Un test vert n'est pas une preuve tant qu'on n'a pas cherché ce qu'il laisse
  passer** — ici le vert était CORRECT et le garde-fou incomplet en même temps.

  ⚠️ **Et la première sonde accusait les SOURCES.** Elle cherchait les littéraux chiffrés
  dans le fichier : elle a signalé « 1990;51(2):241-247 » — l'année et la pagination
  d'une référence, que toute citation doit évidemment porter — et se faisait couper par
  les apostrophes françaises. ➡️ Mesurer le **texte rendu**, pas la syntaxe. Deux nombres
  restent sans constante (`18,5`, la borne OMS du sous-poids ; `5`, les ±5 points d'un
  %MG lu sur silhouette) : ils sont **déclarés en exception nommée**, pas tolérés en
  silence.

  ✅ **Vérifié** : **1 445 tests verts, 87 fichiers**, `tsc` propre. Nouveau fichier
  `methodologie.test.ts` (13 cas, **5 mutations** : chiffre en dur → rouge · source
  amputée → rouge · page injoignable depuis les réglages → rouge · valeur retapée à
  l'identique → rouge · constante du moteur déplacée → **vert, à dessein**).
  ⚠️ **Non vérifié à l'écran** : le worktree sert l'app du dépôt principal (§11). C'est
  un écran de texte défilant, calqué sur `/legal` déjà éprouvé, mais **le verdict
  d'appareil manque** — et il vaudrait la peine ici, la page étant longue.
  ⚠️ **Dépendance entre PR** : la #96 (E39) ajoute une entrée **C7** qui liste A4 comme
  RESTANT. Si elle fusionne après celle-ci, cette ligne est fausse à son arrivée — la
  retirer à la fusion.

- 🤖 **E39 · Le portail de dépistage santé cesse de dépister — et un sous-traitant manquait au registre (2026-08-11)**

  ⚠️ **Écrit et COMMITÉ sous le numéro E37, renuméroté en E39 à la fusion** — le commit
  `3447bb4` et les commentaires de code le citaient ainsi. Entre l'écriture et le merge,
  **trois PR sont passées** : #92 (notifications, qui a elle-même glissé E36 → E37 → E38),
  #93 (haptique, qui a pris E37 et mergé la première, donc elle le garde) et #94.
  **Quatrième renumérotation en deux jours, et cette fois la collision s'est produite
  pendant la résolution du conflit précédent.** ➡️ Le numéro ne se réserve pas : il se
  prend en regardant `main` **au moment de fusionner**. Le commit garde E37, cette fiche
  dit E39, et l'écart est écrit ici plutôt que corrigé en réécrivant l'historique — règle
  en tête de cette section.

  Arbitrage d'une checklist légale revenue de Claude chat, **mesurée contre le code avant
  d'en appliquer une ligne**. Sur ses cinq points « app », **deux étaient déjà faits, un
  reposait sur une prémisse fausse**, et le seul vrai manque qu'elle listait était rangé
  au FUTUR alors qu'il était déjà en production.

  🔴 **CE QUI EST RETIRÉ : les deux questions du portail** (grossesse/allaitement,
  pathologie chronique suivie) et le cul-de-sac derrière. Décision fondateur. Motif :
  subordonner l'accès au service à ces deux critères est un refus de service fondé sur
  des critères de discrimination (art. 225-1 / 225-2), et la réponse est elle-même une
  donnée de santé (RGPD art. 9) qu'aucun texte n'oblige à recueillir. L'écran garde son
  titre, son avertissement, **une phrase de renvoi vers un médecin** et un bouton unique
  « J'ai compris ». `PREGNANCY_OR_NURSING` disparaît de `checkEligibility`.

  ⚠️ **CE N'EST PAS UN GARDE-FOU EN MOINS, C'EST UN GARDE-FOU DÉCLARATIF EN MOINS.** Une
  case cochée n'a jamais rien prouvé de personne. Ce qui protège continue de tourner et
  n'a pas bougé d'une ligne : `MIN_AGE`, l'IMC de départ, le volume d'entraînement, les
  planchers caloriques du moteur. **Ceux-là mesurent au lieu de demander.** Et le renvoi
  vers un professionnel de santé — le seul apport réel du portail, exigé par Apple 1.4.1
  et Google — est CONSERVÉ, simplement dit au lieu d'être vérifié.

  🔴 **TROIS AFFIRMATIONS DE LA CHECKLIST ÉTAIENT FAUSSES, ET AUCUNE N'ÉTAIT DE MAUVAISE
  FOI** — chacune décrivait un état plausible du produit :
  | Ce qu'elle disait | Ce que le disque dit |
  |---|---|
  | « Bloquer les mineurs — vérifier ce que fait le code, **probablement rien** » | bloqué à **trois étages** depuis le 2026-07-28 (`BirthDateField` pendant la saisie, `checkEligibility` → `MINOR`, refus final via `notify`), `MIN_AGE = 18`, et la politique de confidentialité §10 le dit déjà |
  | « Consentement explicite art. 9 : case dédiée, non pré-cochée, séparée des CGU » | **livré** (`login.tsx`), non pré-cochée, exigée par `canSubmit`, et l'écriture est même REPORTÉE jusqu'à l'ouverture de session (sinon la RLS la refuse en silence — corrigé le 2026-08-09) |
  | « Vérifier si les réponses du dépistage ont été persistées → **supprimer le champ ET les données déjà écrites** » | **rien n'a jamais été persisté** : `{passedAt, version}` en AsyncStorage local, et seulement pour qui PASSAIT. Zéro colonne Supabase, zéro entrée dans `PROFILE_COLS` |
  ➡️ **Une checklist rédigée hors du dépôt décrit le produit qu'elle imagine.** Les trois
  se seraient traduites par du travail inutile — dont une chasse à des données de santé
  qui n'existent nulle part. C'est le même motif que « mesurer ce que l'utilisateur reçoit
  AVANT d'exécuter une fiche », rejoué sur un document juridique.

  🔴 **ET LE VRAI MANQUE ÉTAIT RANGÉ AU FUTUR.** La checklist écrivait « ajouter PostHog
  et Resend au registre **avant de les activer** ». Or **Resend est en production depuis
  le 2026-08-09** — il traite l'adresse e-mail de chaque inscription — et il n'était ni
  au §5 « Destinataires et sous-traitants », ni au registre RGPD. Deux jours de retard sur
  la production. ⚠️ Ce qui l'a caché : les mettre **dans le même sac** alors que l'un
  tourne et l'autre dort, et le fait que la phrase « aucun outil d'analyse tiers » restait
  **vraie** — la page se relisait donc sans alarme. ➡️ **Un sous-traitant se déclare le
  jour où il traite, pas le jour où on avait prévu de l'activer.**
  ⚠️ **Ce qui N'A PAS été écrit, faute de l'avoir lu** : le cadre du transfert hors UE de
  Resend (clauses types / DPF, art. 13-1-f). Il ne vit que dans le DPA. La ligne
  « Transferts hors UE » du registre reste donc explicitement EN SUSPENS, avec une case
  🧑 pour le fondateur — même règle que le prestataire d'abonnement, jamais nommé tant
  qu'aucun contrat n'existait. **Une politique de confidentialité n'est pas l'endroit où
  supposer.**

  **Livré aussi (A3 de la checklist, une ligne)** : le libellé du consentement nommait
  « poids, objectif, régime » alors que la taille et le %MG sont traités eux aussi →
  « poids, taille, composition corporelle, objectif, régime ».

  🔴 **DEUX PIÈGES DE MÉTHODE PAYÉS DANS LA SESSION, et le second est le plus utile :**
  1. **`git checkout <fichier>` pour défaire une mutation restaure depuis l'INDEX** — donc
     il a effacé le travail non indexé sur `HealthScreening.tsx` et `safety.ts`. Les deux
     mutations suivantes ont alors tourné sur le fichier d'ORIGINE : elles rougissaient,
     mais pour la mauvaise raison, et le relevé avait l'air bon (« 2 failed », « 3 failed »).
     ➡️ Sauvegarder hors de git avant de muter, et se méfier d'un compteur de rouges qui
     MONTE d'une mutation à l'autre — c'est le signe qu'on cumule au lieu d'isoler.
  2. **Le test qui vérifie l'ABSENCE d'un libellé s'accusait lui-même** : la note qui
     explique le retrait CITE « Es-tu concerné·e ». C'est le défaut d'A30 rejoué (« le
     commentaire se porte garant de ce qu'il décrit »), mais dans le sens ALARMANT cette
     fois — donc la version chanceuse : il rougit au lieu de verdir à tort. ➡️
     `sansCommentairesJS` avant toute recherche de chaîne, et la mutation M4 le prouve
     dans les deux sens : commentaire seul → vert, commentaire + code → rouge.

  ✅ **Vérifié** : **1 402 tests verts, 85 fichiers**, `tsc` propre. `healthScreening.test.ts`
  réécrit (5 cas, **4 mutations, 4 rouges** — un seul test rouge par mutation), harnais
  Playwright `passScreening` recâblé sur le nouveau bouton, et son ancre de contrôle
  changée de cible plutôt que supprimée : le risque « écran introuvable » qui a fait dormir
  la panne du 2026-08-05 est intact, seule la question posée a changé.
  ⚠️ **Non vérifié à l'écran** : le worktree ne peut pas ouvrir le preview (il sert l'app du
  dépôt PRINCIPAL, §11). L'écran est simple — un titre, un encart, un bouton — mais le
  **verdict d'appareil manque**.
- 🤖 **E38 · Les notifications : proposées, increvables, et elles mènent quelque part (2026-08-11)**

  ⚠️ **Ce chantier a été écrit et COMMITÉ sous le numéro E36, puis renuméroté DEUX fois** — ses huit messages de
  commit et la PR #92 le citent ainsi. Il est passé à **E37** au moment de la fusion :
  la branche des matériaux (#90) avait pris E36 en parallèle et a mergé la première,
  donc elle le garde. Puis l'haptique (#93) a pris E37 et a mergé pendant que je
  résolvais le premier conflit : E38. L'écart entre les commits et cette fiche est
  assumé et écrit ici plutôt que corrigé en réécrivant l'historique (règle en tête de
  cette section — renuméroter de l'histoire déjà partie est pire que la collision).
  🔴 **C'est la QUATRIÈME collision sur ce numéro en deux jours**, et la règle qui
  l'annonce était déjà écrite quinze lignes plus haut. Elle dit de regarder `main`
  **ET les branches ouvertes** : `feature/materiaux-apple` existait et n'avait alors
  aucun commit en avance sur `main` — vérifié, et c'est précisément ce qui a rendu la
  vérification fausse. ➡️ **Une branche vide aujourd'hui n'est pas une branche sans
  chantier** : ce qui départage, c'est ce que la session d'en face est en train
  d'écrire, pas ce qu'elle a déjà poussé.

  Trois défauts trouvés en mesurant l'existant, tous les trois **100 % JS donc
  publiables en OTA**. Deux hypothèses ont été TUÉES par la mesure avant d'écrire une
  ligne, et c'est la moitié utile de la fiche.

  **1 · Le rappel quotidien n'était JAMAIS proposé.** Il n'existait qu'à Profil → roue
  dentée → Notifications. La permission système n'était donc quasiment jamais demandée,
  et le seul levier de rétention que CLAUDE.md §5 autorise restait éteint pour presque
  tout le monde — sur un produit dont le North Star est « 7 jours consécutifs dans les
  14 premiers ». 🔴 **Deux commentaires se contredisaient, et le mensonge datait de
  juin** : `onboarding.tsx` affirmait que le rappel « vit désormais dans le reveal du
  1er plan », `FirstPlanReveal.tsx` affirmait l'inverse — c'est le second qui avait
  raison, et personne n'avait relu le premier. ➡️ `components/ReminderOffer.tsx`, une
  carte servie **juste après** le reveal. ⚠️ **Après, jamais avant** : un prompt de
  permission iOS ne se pose qu'UNE fois, refusé il ne se redemande plus. On ne le
  déclenche donc qu'une fois la semaine de repas livrée. ⚠️ **Et l'offre a DEUX
  chemins**, parce que le premier ne sert que les primo-arrivants : le reveal est
  marqué « vu » d'office pour quiconque a déjà un plan, donc tous les testeurs actuels
  ne l'auraient jamais vue. Le second chemin la sert à la première ouverture du Plan
  **après** que le tour a été vu (une modale posée sur la visite guidée lui volerait
  ses taps). ⚠️ **Le web ne MARQUE rien** : `remindersSupported` y est faux, donc
  proposer serait promettre l'impossible — et poser le drapeau ferait perdre l'offre à
  vie à qui a découvert Kyroz dans son navigateur, c'est-à-dire à la plupart des
  testeurs.

  **2 · Le rappel de PESÉE s'éteignait tout seul.** Déclencheur `DATE` = one-shot, et
  le seul chemin qui programmait le suivant était `useWeightLog`, monté par l'écran
  Plan. Quelqu'un qui décroche recevait **UNE** notification de pesée puis plus jamais
  — exactement quand elle sert. 🔴 **Le raisonnement inverse était écrit douze lignes
  plus haut, dans le même fichier**, pour le rappel quotidien : « un rappel qui lâche
  vaut moins qu'un message qui se répète ». Il n'avait jamais été appliqué au voisin,
  qui est pourtant le seul des deux à en avoir eu besoin. ➡️ `weight.ts::weighInSchedule`
  (pur, donc testé) : quotidien → `DAILY`, hebdo → `WEEKLY` sur le jour de l'échéance,
  quinzaine/mois → série de **6 occurrences datées** (84 et 180 jours de couverture),
  chacune portant le texte de SON jour. ⚠️ **`weekday` d'expo commence à 1 = DIMANCHE**,
  là où `getDay()` rend 0 : l'oublier décale le rappel d'un jour, une fois par semaine,
  sans rien casser d'autre. ⚠️ **L'ancien identifiant nu s'annule AUSSI** — il est armé
  sur tout le parc existant ; l'oublier laisserait un doublon le jour de la première
  échéance. ⚠️ Prix assumé : `DAILY`/`WEEKLY` figent leur texte jusqu'au ré-armement,
  comme le rappel quotidien.

  **3 · Toucher une notification ne menait nulle part.** **Zéro**
  `addNotificationResponseReceivedListener` dans tout le dépôt : la réponse au tap
  n'était lue nulle part. Le rappel de pesée dit « trente secondes » et déposait
  l'utilisateur sur l'onglet Recettes, ou dans une feuille de réglages restée ouverte —
  la « friction décroissante » de §4 prise à revers. ➡️ Marqueur `data: { kind }` dans
  les deux rappels, `reminder.ts::intentFromData` (pur), store d'intention
  (`hooks/useNotificationIntent.ts`, patron §11) et lecture au layout racine, sous le
  `Stack` comme `SuiviEcran` — `router.navigate` exige le contexte de navigation.
  ⚠️ **DEUX chemins obligatoires** : l'écouteur rate le tap qui a LANCÉ l'app (il
  n'existait pas encore), d'où `getLastNotificationResponseAsync`. 🔴 **Et celui-ci rend
  la DERNIÈRE réponse, pas une réponse NOUVELLE — elle survit au redémarrage.** Sans
  mémoire, la feuille de pesée se rouvrirait à chaque lancement, pour toujours : le
  défaut qui passe la recette et se manifeste des jours plus tard. La marque est le
  couple identifiant + heure de LIVRAISON, l'identifiant seul étant fixe par
  construction. ⚠️ Repli sur le Plan pour toute notification sans marque : le parc
  porte des notifications programmées AVANT ce chantier, elles doivent rester ouvrables.

  **4 · Les puces « Matin · Midi · Soir » sont retirées des paramètres** (décision
  fondateur en cours de session : *« enlever le matin midi soir, et juste mettre
  l'heure »*). Elles étaient le dernier vestige du modèle d'avant — le rappel se
  réglait sur trois valeurs en dur — alors que le modèle est une heure LIBRE depuis
  le 2026-08-07 : deux champs et une rangée de puces posaient la même question deux
  fois, et les puces gardaient trois heures particulières au rang de proposition que
  le moteur ne distingue plus. `presetOf`, `REMINDER_PRESET_IDS` et
  `REMINDER_PRESET_LABELS` sont supprimés.

  🔴 **CE QUI RESTE N'EST PAS DU CODE MORT, ET IL A FALLU DEUX PASSES POUR QUE LE CODE
  LE DISE.** La table des trois heures survit — la clé `@kyroz:reminder` survit à la
  purge des données et contient encore la chaîne `'morning'` chez tous ceux qui ont
  réglé leur rappel avant l'heure libre. La supprimer éteindrait leur rappel **sans un
  mot**, et une notification qui n'arrive pas ne se signale pas. Premier jet : gardée
  telle quelle, exportée, sous le nom `REMINDER_PRESETS`, avec un gros avertissement
  au-dessus. ➡️ **Le fondateur a demandé si on ne pouvait pas s'en passer — et la
  question était la bonne, mais pas sur le fond** : le vrai défaut n'était pas qu'elle
  existe, c'est que son NOM annonçait des raccourcis d'interface qui n'existent plus,
  ce qui garantissait qu'on la reprenne pour un reliquat. Elle est devenue
  `ANCIENS_CRENEAUX`, **non exportée**, dans son unique lecteur (`parseReminder`),
  nommée d'après ce qu'elle fait : une migration de lecture. Trois lignes, aucune
  surface publique, et le type `ReminderPresetId` disparaît avec.
  ⚠️ **Elle ne pourra JAMAIS être supprimée**, et ce n'est pas une dette : personne ne
  repasse par le champ, donc rien ne réécrit la valeur stockée. C'est un test qui tient
  désormais la porte — la mutation « on supprime la migration » fait rougir 2 cas.
  ⚠️ Et le test de la table a changé de montage au passage : il lisait
  `REMINDER_PRESETS` pour se vérifier, ce qui **ne prouve rien de ses valeurs**. Les
  trois heures sont attendues en LITTÉRAUX.
  ✅ **Seul lot de la session VÉRIFIÉ À L'ÉCRAN** — voir plus bas pourquoi les trois
  autres ne peuvent pas l'être. Réglages → Notifications affiche `08 h 00` et rien
  d'autre ; `Matin`/`Midi`/`Soir` rendent **0** dans le DOM et « Rappel quotidien »
  rend **1** (la sonde sait dire oui). Mesuré sur le bundle RÉELLEMENT servi, prouvé
  par contraste : témoins présents `weighInSchedule` **4** et
  `subscribeNotificationTaps` **4**, témoins ABSENTS `REMINDER_PRESET_LABELS` **0** et
  `presetOf` **0**, sonde bidon **0**.

  **5 · Le recueil de citations passe de 15 à 45** (demande fondateur : « un beau
  lot »). Le couple titre × citation ne se répète donc plus avant **180 jours** —
  six mois — contre 60 auparavant.

  🔴 **CE N'EST PAS UN AJOUT DE CONTENU, C'EST UN CALCUL — et le nombre devait être
  IMPAIR.** Il y a 4 titres par créneau de journée : le cycle vaut leur produit
  **seulement si les deux compteurs sont premiers entre eux**. Toute quantité PAIRE
  de citations divise le cycle par 2 ou par 4. Passer à 44 aurait rendu **44 jours**
  au lieu de 180 — trois fois MOINS de variété en ajoutant vingt-neuf citations, et
  rien dans le diff n'en aurait parlé.

  🔴 **ET LE GARDE-FOU QUI AVAIT DÉSIGNÉ CE DÉFAUT AVAIT CESSÉ DE LE VOIR EN
  GRANDISSANT.** Le test comptait 30 jours distincts. À 15 citations, 30 jours
  dépassaient le cycle, donc le défaut de parité tombait dedans — c'est comme ça
  qu'il avait rougi en son temps (16 → 15 avec 3 titres, cycle 48 → 15). À 45, il ne
  gardait plus rien : **mesuré, une 46ᵉ citation fait tomber le cycle de 180 à 92
  jours et l'ancien test reste VERT** (30/30 dans les deux cas). Il exige désormais
  le cycle ENTIER — `titres × citations` jours tous distincts —, donc il rougit sur
  toute parité cassée quelle que soit la taille du recueil.
  ➡️ *Un garde-fou calibré sur une taille de données cesse de garder quand la donnée
  grandit, et il le fait en silence, dans le sens rassurant.* Même famille que le
  seuil de délai des tests (§11) et que le compteur d'émojis mesuré sur le mauvais
  périmètre (§8).

  ⚠️ **L'ordre du tableau EST l'ordre des jours**, donc le lot ne se colle pas en fin
  de liste : vingt maximes à la suite donneraient vingt jours sans une seule
  signature. Il est ENTRELACÉ à la main — 16 signées, 29 maisons, jamais trois de la
  même famille d'affilée, **bouclage compris**.

  ⚠️ **Sur les attributions, la règle du fichier ne bouge pas d'un cran** (« un auteur
  faux est un mensonge affiché »). Les signatures ajoutées — Hésiode, Cicéron,
  Publilius Syrus, Vauvenargues, Montaigne, La Rochefoucauld, plus du Sénèque, du
  Marc Aurèle, de l'Ovide et du Lao Tseu — sont **brèves et archi-documentées**, et
  c'est le critère : plus une citation est longue, plus elle dépend d'une TRADUCTION
  particulière, et une traduction récente n'est pas du domaine public même quand
  l'auteur l'est depuis deux mille ans. 🧑 **Au moindre doute sur une attribution,
  elle se transforme en maxime SANS signature** — ça ne coûte rien et ça ne fait
  mentir personne. Le fondateur peut en biffer : retirer une signée coûte au plus
  deux maisons (l'alternance exige `maisons ≤ 2 × signées`), et il faut **rester sur
  un nombre impair**.

  ➡️ Vérifié par 4 mutations de plus : nombre pair, trois maisons d'affilée,
  attribution glissée dans le texte d'une maxime, mot qui met la pression.

  **6 · Le risque juridique des citations est CIBLÉ, et ce n'est pas celui qu'on
  croit** (question du fondateur : « point de vue légal, rien ne dérange ? »).

  Les ŒUVRES ne posent aucun problème : le plus récent des auteurs cités est
  Vauvenargues, **mort en 1747**. Ce n'est pas la question.
  🔴 **La question, c'est la TRADUCTION — une œuvre à part, protégée 70 ans après la
  mort du TRADUCTEUR.** Marc Aurèle est libre ; une traduction parue en 1992 ne l'est
  pas. Et ça ne se voit nulle part en lisant la liste : sur les deux noms qui
  comptent, un seul est écrit.

  ➡️ Une citation est hors d'atteinte si **son auteur écrivait en français** (aucun
  traducteur entre lui et l'écran — Montaigne, La Rochefoucauld, Vauvenargues) **ou**
  si elle est assez COURTE pour qu'aucune empreinte personnelle de traducteur n'y
  tienne. `AUTEURS_DE_LANGUE_FRANCAISE` + `TRADUCTION_MAX = 90`.

  ⚠️ **90 et non 60 : c'est un arbitrage mesuré, pas une approximation.** Le plafond
  de 60 d'abord proposé aurait forcé à remplacer QUATRE citations de plus, dont « la
  goutte d'eau creuse la pierre » (Ovide) et « il n'est pas de vent favorable pour qui
  ne sait où il va » (Sénèque) — des **proverbes français** dont la forme circule bien
  avant toute traduction vivante. Les retirer n'achetait aucune sécurité. Le risque
  réel est la rédaction LONGUE, littéraire et moderne.
  ⚠️ Et le plafond n'est pas décoratif : la plus longue traduite en service
  (**Épictète, 84**) passe à **6 caractères** de la limite. Un test fige cette marge.

  ✅ **Une seule citation retirée** : « Tu as pouvoir sur ton esprit, non sur les
  événements extérieurs… » (**104 car.**) → remplacée par un Marc Aurèle bref et
  littéral (Pensées VII, 59). Elle cumulait les deux défauts — la plus exposée côté
  traduction, et une forme qui circule surtout comme **condensation moderne** des
  Pensées plutôt que comme un passage qu'on y retrouve tel quel. *(Elle était là avant
  ce lot, dans les 15 d'origine.)* Une signée remplacée par une signée : le compte
  reste à 45, l'alternance et le cycle de 180 jours ne bougent pas.

  🔴 **UNE CITATION NE SE RACCOURCIT PAS POUR PASSER SOUS LE PLAFOND** — la règle
  écrite de longue date prime sur celle-ci. Une traduction trop longue se REMPLACE, ou
  perd sa signature. La tronquer ferait dire à Sénèque ce qu'il n'a pas écrit, soit
  exactement le mensonge qu'on cherche à éviter.

  ➡️ **Vérifié par 4 mutations, dont les deux ÉCHAPPATOIRES** — parce qu'un plafond se
  contourne plus facilement qu'il ne se franchit : (1) relever `TRADUCTION_MAX` pour
  faire entrer la citation, (2) inscrire son auteur dans la liste « écrit en français »
  au lieu de raccourcir. La première est arrêtée par la marge figée, la seconde AUSSI —
  exempter Épictète fait retomber la pire traduite à 77, donc la marge à 13, donc le
  test rougit. *Un garde-fou doit tenir la porte de derrière autant que la porte
  d'entrée.* Plus un test qui interdit un nom DORMANT dans la liste des auteurs de
  langue française, cas où on l'aurait remplie pour faire taire les autres.

  ℹ️ Ce qui n'est PAS un sujet juridique et reste une règle maison : l'exactitude des
  attributions. Prêter à Marc Aurèle une phrase qu'il n'a pas écrite n'expose devant
  aucun tribunal — seulement devant un utilisateur qui vérifie.

  🚫 **Deux hypothèses écartées PAR LA MESURE, et le résultat négatif compte :**
  - « les rappels sont muets » → **FAUX**. expo-notifications 56.0.18,
    `ios/.../NotificationRecords.swift` : sans `sound`, iOS pose `.default`
    (« to behave the same as android, otherwise there'd be no sound »).
  - « il manque un canal Android » → le canal de repli est déjà `IMPORTANCE_HIGH` +
    vibration (`BaseNotificationBuilder.kt`). Des canaux **nommés** seraient un confort
    (couper la pesée sans couper le rappel), pas un correctif. **Lot écarté par le
    fondateur**, avec le nettoyage du code mort du Profil (`profil.tsx` importe encore
    `ReminderTimeField` et `useReminder()` sans s'en servir depuis E33).

  ➡️ Garde-fous : `weight.test.ts` (+7 cas) et `reminder.test.ts` (+6 cas),
  **vérifiés par 9 mutations**. ⚠️ **Et la 9ᵉ a rougi le test, pas le code** : le cas qui
  tient la mémoire du dernier tap se contentait de trouver la clé quelque part dans le
  corps — retirer l'ÉCRITURE le laissait VERT, puisque la LECTURE cite la même clé. Il
  compte désormais les deux moitiés. *Le garde-fou visait juste et gardait à moitié.*

  🔴 **NON VÉRIFIÉ À L'ÉCRAN, et voici pourquoi** : les notifications locales n'existent
  pas sur le web (`remindersSupported === false`), donc **aucun** des trois lots n'est
  observable dans le panneau navigateur — pas même la carte d'offre, que `offrirLeRappel`
  refuse d'y afficher. Ce qui a été vérifié : `tsc` propre, suite verte, les 9 mutations,
  et le **pré-rendu web complet** (`expo export -p web`, 20 routes statiques rendues —
  le piège §11 du module qui touche le système au chargement). Ce qui reste à voir sur
  un vrai appareil : le prompt de permission, l'arrivée du rappel, et le tap qui ouvre
  la feuille de pesée.
- 🤖 **E37 · Le RETOUR AU TOUCHER, et une affirmation démentie par la mesure (2026-08-11)**

  Septième axe, et le seul qui ne se voit sur aucune capture. Kyroz ne rendait **rien**
  à la main : ni sur le geste central (cocher un repas), ni sur le plus répété (cocher
  un article de courses), ni quand une action est refusée.

  🔴 **LA RÈGLE PREMIÈRE EST UNE RÈGLE DE RARETÉ, et l'occasion de l'enfreindre était
  évidente.** `Presse` centralise les 129 pressables de l'app : y brancher un retour par
  défaut mettait une vibration sous chaque bouton **en une ligne**, sans qu'aucun test ne
  le voie. Apple écrit « use haptics sparingly », et la raison n'est pas le confort — un
  retour que l'on sent partout ne signale plus rien. La prop `retour` n'a donc **aucune
  valeur par défaut** ; chaque site qui en veut un le NOMME, et le test le compte.

  **Quatre rôles, quatre moments** : `choix` (cocher un article de courses — trente
  d'affilée, en magasin, souvent sans regarder : d'où `selectionAsync`, le tic léger, et
  pas un retour de succès qui serait épuisant) · `validation` (« J'ai cuisiné », le geste
  que Kyroz existe pour faire arriver) · `refus` (échec de connexion — le message
  s'affiche sous le champ, hors du regard de qui vient d'appuyer : la main l'apprend
  avant l'œil) · `declic` (la feuille vient de décider qu'elle partait, avant de bouger).
  ⚠️ Deux rôles ne peuvent pas partager une sensation, et un rôle jamais employé est un
  token sans rôle : les deux sont comptés.

  ⚠️ **Pas de store d'accessibilité**, contrairement au verre et au mouvement :
  `UIFeedbackGenerator` respecte tout seul « Retour haptique du système ». Dupliquer une
  décision déjà prise par le système, c'est créer un endroit où elle peut diverger.
  ⚠️ **Le web est coupé volontairement** : `expo-haptics` n'y est pas neutre — il appelle
  `navigator.vibrate` et, sur iOS Safari, injecte un `<input switch>` caché qu'il clique
  pour arracher une vibration au système. Un SITE qui fait vibrer un téléphone est une
  surprise, pas une affordance. À relire si Kyroz devient une PWA installable.

  🔴 **ET L'ARGUMENT QUI PLAÇAIT CE LOT APRÈS LE BUILD ÉTAIT FAUX.** Il était annoncé —
  par moi, deux fois, dont une dans une recommandation d'ordre — qu'ajouter
  `expo-haptics` « fermerait la voie OTA » jusqu'au build 1.0.0 (4). **Mesuré sur le
  simulateur**, dont le dev client ne contient PAS `ExpoHaptics` (0 occurrence dans
  `ios/Podfile.lock`) : cocher un repas fonctionne, l'app tient debout, le processus
  survit. Et il fallait distinguer **deux** mécanismes pour ne pas attribuer le mérite au
  mauvais : le paquet utilise `requireOptionalNativeModule`, qui rend `null` au lieu de
  lever — donc **l'import ne crashe pas**, et c'est le gros du risque ; mais l'appel,
  lui, LÈVE dans une fonction `async`, donc il **rejette**, et seul le `.catch` de
  `retourHaptique.ts` évite un `unhandledrejection` à chaque appui. ➡️ Le lot est
  **publiable en OTA** : il ne vibre pas sur les binaires d'avant, il s'active au build.
  ➡️ **La bonne question n'est jamais « ce module est-il dans le binaire ? » mais « que
  fait le paquet quand il n'y est pas ? »** — et ça se lit en trois lignes de source.
  Symétrie avec E36, où la prémisse fausse allait dans l'autre sens.

  **Garde-fou : `lib/__tests__/haptiqueDA.test.ts`** (8 cas), vérifié par **9 mutations,
  9 rouges**. Il garde la rareté (aucun défaut dans `Presse`, et la prop reste branchée),
  la table (rôles distincts, ni trou ni surplus), la coupure web, l'emploi effectif de
  chaque rôle, le point de câblage unique, et le `.catch` — celui-là même qui rend l'OTA
  possible, et qu'on retirerait sans rien voir de rouge.

  ⚠️ **Ce qui n'est PAS prouvé** : la sensation elle-même. Le simulateur n'a pas de
  moteur haptique — comme le mouvement, ça se juge à la main sur un vrai iPhone.

- 🤖 **E36 · Le MATÉRIAU — la barre d'onglets passe au verre, et une prémisse tombe (2026-08-11)**

  Sixième axe après forme, texte, blanc, finitions et mouvement. Kyroz ne connaissait
  qu'un matériau : **la peinture opaque**. Ce chantier était réputé « pour le build
  suivant » — il est parti en OTA le jour même, parce que la raison qui l'en empêchait
  n'avait jamais été mesurée.

  🔴 **LA PRÉMISSE ÉTAIT FAUSSE, ET ELLE A TENU UNE SEMAINE.** `CollapsingTitle.tsx`
  portait depuis le 2026-08-04 : « le flou demande `expo-blur`, donc une dépendance
  NATIVE — un nouveau build, une nouvelle revue, et la voie OTA fermée ». Mesuré :
  **`expo-router` tire `expo-glass-effect` (56.0.4) et `expo-symbols` (56.0.6) sans les
  déclarer dans `package.json`**, exactement comme il tire reanimated et gesture-handler.
  Le pod `ExpoGlassEffect` est donc compilé dans le binaire **1.0.0 (3) du 3 août** —
  vérifié dans `ios/Podfile.lock` ET dans le `package-lock.json` de cette date (la
  version d'`expo-router` n'a pas bougé depuis le 31 juillet). Et ce n'est pas un flou
  maison : c'est le **Liquid Glass du système**. ➡️ Une phrase de fiche qui commence par
  « ça demanderait » CHOISIT la question à la place de celui qui la lit. Se re-mesure.
  ⚠️ **Et l'inversion vaut dans l'autre sens** : `expo-haptics`, lui, est bien **absent**
  du binaire. La recommandation d'avant ce chantier — « l'haptique d'abord, le verre plus
  tard » — était exactement à l'envers.

  **Ce qui est livré.** `lib/materiau.ts` (pur, sans aucun import — condition de sa
  testabilité) décide **quand** servir du verre, jamais à quoi il ressemble ;
  `components/Materiau.tsx` fait le câblage et le repli ; `lib/reduceTransparency.ts`
  diffuse le réglage d'accessibilité, miroir exact de `reduceMotion.ts` (store externe +
  `useSyncExternalStore` + abonnement, patron obligatoire de CLAUDE.md §11) ; la barre
  d'onglets passe en `position:'absolute'` avec `tabBarBackground`.

  ⚠️ **Trois conditions, pas une, et sauter la première FAIT CRASHER l'app** : l'API
  native doit répondre (`requireNativeModule` LÈVE sur un binaire d'avant, et une OTA
  peut atterrir sur un tel binaire — expo/expo#40911), le design Liquid Glass doit être
  actif (faux sur iOS 18 et en dessous), et « Réduire la transparence » doit être éteint.
  **Le repli n'est pas un mode dégradé : c'est l'app d'avant au pixel près** — c'est
  précisément ce qui autorise l'OTA.

  🔴 **LA MOITIÉ DU TRAVAIL QU'ON OUBLIE : une barre en verre FLOTTE.** Elle sort du flux,
  donc le contenu défile dessous — sans dégagement de bas, la dernière ligne d'une liste
  finit **cachée**, tout en bas d'un défilement, là où aucune capture ne regarde. Les cinq
  onglets portaient déjà `paddingBottom: Fond.barreOnglets` (120 pt = 88 de barre + 32
  d'air) : le terrain était prêt. Ce n'est pas une coïncidence heureuse à laisser sans
  surveillance — `materiauxDA` **compte** ces cinq dégagements, et vérifie le compte
  d'écrans **avant** le contenu (un test qui parcourt un dossier vide passe au vert sans
  rien mesurer).

  🔴 **UN CHANTIER ANNULÉ EN COURS DE ROUTE, PAR LA MESURE.** La barre de titre compacte
  (`CollapsingTitle`) devait recevoir le même traitement. Vérifié au simulateur **en la
  teignant en rouge translucide** : **rien ne passe derrière elle**. `plan.tsx` monte son
  `ScrollView` dans un `SafeAreaView edges={['top']}`, donc le contenu commence SOUS la
  zone sûre — c'est-à-dire sous la barre. Un matériau translucide n'y a rien à laisser
  voir : il rend le même noir, en coûtant une vue native **et le filet**, qui avait bel et
  bien disparu de la capture. ➡️ Retour en arrière sur ce fichier. **La deuxième phrase de
  sa fiche était fausse aussi** (« le contenu passe dessous et disparaît ») — et la mesure
  qui l'a démentie rend le filet *indispensable* plutôt que décoratif : puisque rien ne
  glisse dessous, il est la seule chose qui explique pourquoi le contenu s'arrête là.
  ⚠️ **La sonde visuelle bat la relecture de code** : deux hypothèses plausibles (le verre
  ne s'applique pas / il n'y a rien derrière) rendaient la même capture noire. Seul le
  rouge a tranché.

  **Garde-fou : `lib/__tests__/materiauxDA.test.ts`** (8 cas), vérifié par **8 mutations,
  8 rouges** — une par promesse du fichier. Il **écarte les commentaires avant toute
  recherche de chaîne**, et ce fichier en est l'illustration : les notes de `Materiau.tsx`
  CITENT `expo-glass-effect`, précisément la chaîne interdite. Sans ce nettoyage, le test
  serait passé au vert sur la ligne qui explique pourquoi on l'interdit. ⚠️ Au premier
  lancement il **s'est accusé lui-même** — bon signe : la sonde regarde vraiment le code.

  ⚠️ **Ce qui n'est PAS prouvé, et il faut le lire** : la bascule « Réduire la
  transparence » n'a pas pu être jouée en usage réel — `simctl ui` ne l'expose pas, et
  l'interrupteur des Réglages du simulateur n'a pas répondu au tap (deux essais). La
  logique est couverte par le test pur et le câblage est le miroir d'un patron déjà
  livré, mais **le verdict d'appareil manque**.

- 🤖 **E35 · Le MOUVEMENT reçoit son rôle, ses tokens et son compteur (2026-08-10)**

  Cinquième et dernier axe de la DA à recevoir une passe, après la forme, le texte, le
  blanc et les finitions. Il n'avait **rien** — ni token de durée, ni courbe, ni test —
  et il avait donc dérivé pour exactement la raison des quatre autres avant eux : rien
  ne l'obligeait. Périmètre exécuté : **le lot sans build** (E29 §1–7 et 9). Le retour
  haptique et le verre dépoli attendent le build 1.0.0 (4).

  **Ce qui est livré**, dans l'ordre du levier :
  1. **La vitesse du doigt était lue puis JETÉE.** `vy > 0.4` décidait *si* on ferme,
     la sortie durait ensuite 240/200 ms fixes — effleurée ou balancée, le même
     mouvement. Elle entre désormais dans le calcul du point d'arrivée
     (`decisionFeuille` projette avec la fonction d'Apple) **puis** devient la vitesse
     d'entrée du ressort. Plus de couture entre le doigt et l'animation.
  2. **12 des 16 `Animated.timing` n'avaient aucune courbe** → RN applique `easeInOut`,
     donc un démarrage LENT sur toute entrée. Passées en `Easing.out`. Seule exception
     gardée : la chute des confettis, en `linear` — une chute ne ralentit pas en
     arrivant, la règle « ease-out partout » vaut pour ce qui se pose.
  3. **« Réduire les animations » était ignoré par TOUTE l'app** (`AccessibilityInfo` :
     0 fichier). Store diffusé + abonnement à `reduceMotionChanged` — ce réglage-ci
     change PENDANT que l'app tourne, ce qui le distingue des cinq autres valeurs
     d'appareil. Réduire ≠ supprimer : on garde ce qui informe, on retire ce qui déplace.
  4. **129 pressables pâlissaient sans s'enfoncer.** `components/Presse.tsx`, échelle
     0,97 au ressort, même surface d'API pour que la migration soit MÉCANIQUE.
  5. Caoutchouc aux bords, 6. ouverture interruptible, 7. tokens `DUREE`/`RESSORT`,
     9. double fondu des trois célébrations retiré.

  **`lib/motion.ts` n'importe RIEN, et c'est la condition de son existence.** `theme.ts`
  tire react-native, donc ce qui y vit ne se vérifie qu'en le lisant comme du texte. Or
  le mouvement ne se résume pas à des constantes : il porte des DÉCISIONS (où atterrit
  un geste, quelle résistance à un bord), et une décision se teste en l'appelant. Même
  procédé que `collapsingTitle.ts` et `tours.ts`.

  🔴 **UNE PREMIÈRE VERSION DE `Presse` AURAIT CASSÉ LA MISE EN PAGE DES 129 SITES.**
  Elle enveloppait les enfants dans une `Animated.View` — or le `style` d'un pressable
  porte presque toujours un `flexDirection` ou un `gap`, qui s'appliquent à ses ENFANTS
  DIRECTS. Une vue intermédiaire les aurait tous regroupés en UN enfant : chaque rangée
  icône + texte serait devenue une colonne, partout, sans qu'aucun test ne le voie.
  C'est le `Pressable` lui-même qui est animé, au prix assumé de 3 % de zone tactile.

  🔴 **LE GARDE-FOU DES 44 PT EST DEVENU AVEUGLE EN RESTANT VERT.** `espacementDA`
  cherchait `TouchableOpacity|Pressable|TouchableHighlight` : après la migration il ne
  reconnaissait plus AUCUN pressable de l'app et ne mesurait plus rien du tout.
  ➡️ **Un garde-fou nommé d'après une IMPLÉMENTATION meurt le jour où on en change, et
  il meurt en silence, dans le sens rassurant.** Tout composant pressable ajouté doit
  être ajouté à cette liste le même jour. Rebranché, re-vérifié par mutation.

  ⚠️ **Et le nouveau compteur a MENTI avant de dire vrai** — dans le sens ALARMANT,
  celui qu'on remarque. Son expression régulière s'arrêtait au premier `)`, donc sur
  `duration: dureeReduite(DUREE.court, reduire),` elle coupait AVANT le `easing:` posé
  deux lignes plus bas : **10 fichiers accusés de n'avoir aucune courbe alors qu'ils en
  ont une**. On équilibre les parenthèses, et la sonde sait désormais dire OUI autant
  que NON. *Même famille que « mesurer l'instrument » (§11), sur un outil écrit le jour
  même.*

  ⚠️ **Deux captures dangereuses évitées** : le `PanResponder` est créé une seule fois,
  donc la hauteur d'écran (rotation iPad) et le réglage d'accessibilité y seraient FIGÉS
  au premier rendu. Lus depuis une ref et depuis le store — sinon le geste travaille
  avec l'état du démarrage, et ça ne se voit sur aucune capture.

  ⚠️ **Piège d'unités, facteur 1000** : `vy` de `PanResponder` est en px/MILLISECONDE,
  un ressort intègre en secondes. `vitesseDepuisPan` fait la conversion. L'oublier donne
  un correctif qui a l'air de n'avoir rien fait.

  📊 **1 395 verts / 84 fichiers**, `tsc` propre — mesuré sur la branche
  `feature/mouvement-apple`. ⚠️ À RE-MESURER au moment du merge, pas maintenant : c'est
  la leçon de #81, fermée parce que devenue fausse entre son ouverture et son merge.
  Nouveau fichier : `mouvementDA.test.ts` (14 cas, **3 mutations**).

  🔴 **CE QUI N'EST PAS VÉRIFIÉ, ET IL FAUT LE LIRE AVANT DE PUBLIER** : le RESSENTI.
  L'app a été construite et lancée au simulateur (iPhone 17 Pro, iOS 27) — la mise en
  page des 129 sites migrés est intacte en natif comme en web, sur les écrans les plus
  chargés. Mais **aucun geste n'a pu être injecté** : le panneau simulateur de
  l'outillage a planté et refuse de rouvrir dans cette session. Donc le glissement des
  feuilles, la vitesse héritée et l'enfoncement au doigt restent **à juger à la main**.
  ⚠️ Deux obstacles rencontrés en chemin, notés parce qu'ils reviendront : `pod install`
  crashe si `LANG` n'est pas en UTF-8 dans l'environnement de la session
  (`Encoding::CompatibilityError`, la trace n'accuse que Ruby) ; et `expo run:ios` peut
  finir en `openurl` expiré alors que **le build a réussi** — l'app est installée, il
  suffit de relancer Metro et de rouvrir l'URL du dev client.


- ~~**E34 · Le rangement du Profil — lot 1**~~ ✅ **LIVRÉ le 2026-08-10.**
  ⚠️ **NUMÉROS : E33 et E34, après TROIS renumérotations le même jour.** Ce lot est né
  « E26 », puis « E27/E28 », puis « E30/E31 » — les trois fois faux. `main` a mergé E26
  (consentement analytics), E29 (chantier mouvement) puis **E30–E32** (la PR #74, qui
  s'était elle-même renumérotée) pendant que cette branche vivait.
  ➡️ **Un numéro pris sur une branche n'est PAS réservé** : il se re-vérifie au moment de
  fusionner, contre `main` **et** contre les PR ouvertes (`gh pr list`), et il peut sauter
  plusieurs fois dans une même journée. L'avertissement était écrit sous chaque entrée
  depuis le début ; s'y cogner trois fois aura été le seul moyen de le lire vraiment.
  💡 Le coût réel n'est pas le numéro, c'est le REBASE qu'il impose à chaque fois — donc
  la vraie leçon est de fusionner tôt, pas de mieux deviner.
  *Décision fondateur, après contre-analyse en conversation : « on garde la coupe. Aucune
  ligne ne change de surface. »*
  ⚠️ *Numéro pris sur une branche : le vérifier contre `main` au moment de fusionner.*

  **La question posée était « faut-il mettre les infos perso derrière la roue ? ». La
  réponse est NON, et l'arbitrage est une asymétrie de coûts** : ne pas trouver sa taille
  coûte 10 secondes une fois ; un mauvais NEAT coûte des dizaines de kcal/jour pendant des
  mois. Tout ce qui éloigne le bloc TOI joue du mauvais côté. **Aucune ligne n'a donc
  traversé la frontière Profil ↔ roue** — ce qui change est ce que l'écran DIT de lui-même.

  **1 — Trois chapitres au lieu de deux, chacun avec un SOUS-TITRE.** C'est le sous-titre
  qui fait le travail, pas le découpage : « TON PLAN » disait de quoi le bloc parlait,
  jamais ce qu'il PILOTAIT.
  `TOI — ce qui calcule ta dépense` (Informations · Sport & activité) ·
  `TON OBJECTIF — ce qui fixe tes cibles` (Objectif · Objectif daté · Calories & macros) ·
  `TES REPAS — ce qui remplit ton assiette` (Préférences · Paramètres des repas · Banque ·
  Écarts passés). « Calories & macros » a changé de bloc : il ne remplit aucune assiette,
  il fixe le nombre que les assiettes doivent atteindre.

  **2 — La FORME d'une ligne dit sa nature.** Une action n'a pas de valeur à droite :
  « Régénérer mon plan » devient un **bouton** pleine largeur hors liste (fond de carte, pas
  l'accent — il ne doit pas crier plus fort que la pesée). « Repas hors plan » → **« Écarts
  passés »**, collée à « Banque de calories » : la banque PRÉVOIT, l'historique CONSTATE.
  Kyroz+ passe en **dernière ligne, hors chapitre** — une offre se range là où elle se vend.

  🔴 **3 — LE SEUL DÉFAUT RÉEL DU LOT, ET IL ÉTAIT SILENCIEUX : le poids avait DEUX portes
  d'entrée qui n'écrivaient pas la même chose.** « Me peser » (`useWeightLog::logWeight`)
  ajoute un point à la série **et** recale le profil ; le champ « Poids » d'`InfoEditor` ne
  recalait que le profil. Sur le MÊME écran et dans le même défilement, la carte du haut
  affiche le poids du **profil** en grand, au-dessus d'une courbe et d'un « −0,9 kg depuis
  la précédente » tirés de la **série**. Corriger 83 → 80 dans « Informations » affichait
  donc « 80 kg », un écart calculé sur une série qui s'arrête à 83, et une courbe qui ne
  descend pas jusqu'au chiffre écrit au-dessus d'elle. Le suivi de l'objectif daté lit la
  même série : il continuait de projeter depuis un poids abandonné.
  ➡️ Le champ devient une **ligne de renvoi** vers « Me peser ». ⚠️ La feuille de pesée est
  poussée APRÈS fermeture de l'éditeur — une feuille ouverte depuis une feuille naîtrait
  sous elle (le 4ᵉ piège d'E25, par une autre porte). **Vérifié à l'écran.**
  ➡️ **La règle : une donnée qui alimente une SÉRIE ne se corrige pas par un champ qui
  ignore la série.** Le défaut ne se voyait pas en lisant `InfoEditor`, qui est correct
  isolément — il apparaît quand on regarde les deux écritures côte à côte.

  ✅ **§4 du brief, vérifications faites** : visite guidée rejouée en entier, **6 bulles
  sur 6**, défilement **0 → 365 → 576 → 789 → 1153 px** puis retour à 0 pour la roue —
  monotone, aucune étape écartée. « Régénérer » ayant quitté `MenuRow`, son `tourId` est
  devenu une `useTourTarget` posée sur le bouton : **sans elle, l'étape aurait disparu en
  silence** et le tour se serait joué à 5 bulles en affichant « 5 / 5 ».

  🟡 **CE QUI A ÉTÉ REFUSÉ DU BRIEF, ET POURQUOI** : il demandait que la valeur d'« Écarts
  passés » devienne un COMPTE (« 2 ce mois-ci »). **Refusé** — une décision antérieure,
  écrite dans le code, l'interdit : *« la valeur ne compte pas les écarts : un score posé là
  mettrait la pression sans qu'on ouvre quoi que ce soit »* (règle anti charge mentale).
  La valeur reste un **fait daté** (« Depuis le 3 août » / « Aucun pour l'instant »), ce qui
  satisfait la règle de forme du brief — un fait, pas un état modifiable — sans rouvrir une
  décision produit. ➡️ **Un brief écrit sans accès au code ne peut pas connaître les
  décisions qui vivent dedans** : les appliquer à la lettre en aurait effacé une.

  🔴 **§7 du brief — la contradiction est levée, et c'est MOI qui avais tort.** Le brief
  source annonçait « ~90 kcal/j le cran », repris d'un commentaire ; la contre-analyse
  citait `desk = 1,20`, vrai avant le 2026-07-31. **Table réellement en vigueur, lue dans
  `tdee.ts`** : `desk 1,30 · light 1,35 · active 1,40 · physical 1,45`. **Mesuré** sur 800
  gabarits (2 sexes × 4 âges × 5 poids × 4 tailles × 5 objectifs, 2 400 écarts) : un cran
  vaut **57 à 102 kcal/j de dépense, médiane 80** ; `desk → physical` vaut **272 kcal/j**
  sur un H de 83 kg. ⚠️ Sur la **cible servie**, le plancher amortit **274 crans sur 2 400**
  de plus de 5 kcal et en **efface 140 entièrement**. ➡️ Citer **80**, jamais 90, et
  toujours en disant « dépense » — la cible, elle, peut ne pas bouger d'une calorie.
  `CLAUDE.md` §6 corrigé.

  🔒 **Garde-fou : `profilSection.test.ts` passe de 8 à 11 cas.** Trois nouveaux, chacun
  **vérifié par mutation** : « Régénérer » redevenu une ligne de menu (rouge) · un champ
  « Poids » réintroduit (rouge) · un chapitre privé de son sous-titre (rouge).
  ⚠️ **Et l'extraction des titres a dû être élargie** : `SectionLabel` porte désormais un
  `sub`, or l'expression collée à `t={t}>` rendait **zéro titre** — donc un test VERT qui ne
  regardait plus rien. Un scan de source se relit à chaque fois que la signature du
  composant qu'il scanne bouge.
  📊 **1 367 / 82 → 1 378 / 83**, `tsc` vert. ⚠️ Ce compte a été re-mesuré **trois
  fois** dans la même session — 1 340, puis 1 345, puis 1 378 — chaque fois juste sur sa
  base et faux au rebase suivant. Ce n'est pas de la négligence : en sessions parallèles,
  **tout compteur pris avant fusion périme au merge suivant**. Le seul chiffre qui vaille
  est mesuré sur l'arbre qu'on s'apprête à pousser.

  ⏭️ **Lot 2, après le lancement** (décidé, pas fait) : décomposer la carte « Dépense
  estimée » en métabolisme + journées + sport, la part « journées » tapable → ouvre le
  NEAT · poser la question du NEAT à l'inscription (⚠️ pas avant d'avoir re-mesuré, cf.
  ci-dessus) · un événement `profile_row_opened` **avec l'identifiant de ligne seul, jamais
  sa valeur** (l'id `objectif` n'est pas une donnée de santé, la valeur `Sèche` en est une)
  · renommer l'onglet seulement si le Profil devient un vrai tableau de bord — renommer
  oblige à refaire les captures de la fiche App Store.
  📌 **Seuil à surveiller** : si la liste des réglages du Profil dépasse ~15 lignes, l'option
  « Profil = tableau de bord pur, tous les réglages derrière la roue » redevient la bonne
  réponse. Elle est écartée aujourd'hui parce qu'elle casse 4 bulles sur 6 et fait passer la
  feuille de 13 à 24 contrôles.

- ~~**E33 · Ce que la refonte du Profil avait laissé derrière elle**~~ ✅ **LIVRÉ le
  2026-08-10.** *Demande du fondateur, le même jour : « continuons d'améliorer la
  section profil ».*
  ⚠️ *Numéro pris sur une branche : le vérifier contre `main` au moment de fusionner.*

  **Quatre défauts, tous trouvés À L'ÉCRAN** (profil seedé dans le panneau web : H 30 ans,
  83 kg, 18 % MG, sèche, 3 × 60 min, 4 pesées) **et aucun en relisant le code.** Ils ont
  ceci en commun : chaque morceau était juste isolément, c'est l'ASSEMBLAGE qui ne l'était
  plus — la signature d'une refonte qui déplace des blocs sans relire ce qui les nommait.

  🔴 **1 — « Réglages » désignait DEUX endroits sur le même écran.** La roue dentée
  (`accessibilityLabel="Réglages"`) ouvre une feuille intitulée « Réglages » ; le milieu de
  l'écran portait un `SectionTitle` « Réglages ». Depuis E25 les deux ensembles sont
  **disjoints** — là-bas notifications / affichage / confidentialité / compte, ici ce qui
  pilote le moteur. « Va dans les réglages » ne désignait donc plus rien. Le commit d'E25
  nommait déjà les deux blocs **« Toi / Ton plan »** : c'est le CODE qui était resté sur
  l'ancien nom, pas la décision.
  ➡️ « TOI » est désormais un `SectionLabel`, comme « TON PLAN ». Avant, l'un était un
  `SectionTitle` (« découpe l'écran ») et l'autre un `SectionLabel` (« étiquette un
  bloc ») : le premier bloc n'avait **aucune étiquette à lui**, il empruntait celle du
  chapitre — deux blocs frères à deux hauteurs différentes.

  🟠 **2 — Deux lignes voisines poussaient la même route, et l'une promettait un mail.**
  `Donner mon avis` → `/avis`, et juste dessous `Aide & contact · contact@kyroz.app` →
  `/avis` **aussi**. E25 avait donné à l'ancienne ligne le `onPress` de la nouvelle en lui
  laissant l'adresse comme VALEUR : elle affichait une action qu'elle ne faisait pas.
  Retirée — `/avis` montre l'adresse lui-même en repli quand aucun client mail ne répond.
  ➡️ **Et le mort-vivant symétrique dormait dans `profil.tsx`** : `contactSupport`, sa
  constante `SUPPORT_EMAIL` en dur et l'import `Linking` n'étaient plus appelés par
  personne depuis E25. Une adresse recopiée à côté de `lib/feedback.ts::SUPPORT_EMAIL`,
  c'est la première des deux qui ment le jour où elle change.

  🟡 **3 — Le TDEE était à ~900 px de la cible qu'il explique.** « Tes cibles · 2 293 kcal »
  en haut, « Dépense estimée · maintenance · 2 593 kcal » tout en bas, **après les onze
  lignes de menu**. C'est pourtant la seule ligne de l'écran qui réponde à « pourquoi
  2 293 ? ». Remonté juste sous les quatre boîtes (après leurs notes, qui les annotent).

  🟡 **4 — Le surtitre ne disait rien de neuf.** « Homme · 30 ans · Sèche » était **mot pour
  mot** ce que `Informations` et `Objectif` redisent 600 px plus bas. Il porte maintenant le
  **prénom** — la seule chose de cet écran qui ne soit écrite nulle part ailleurs. Pas de
  prénom (compte antérieur à la question) → pas de ligne, plutôt qu'un remplissage.

  ➡️ **LE PIÈGE ÉTAIT DANS LA CORRECTION, PAS DANS LE DÉFAUT.** L'ordre des étapes de la
  visite guidée suit l'écran de haut en bas, et chaque bulle **fait défiler** jusqu'à sa
  cible. `profil-tdee` était en avant-dernier — correct tant que le bloc vivait en bas.
  Le remonter sans remonter l'étape aurait fait descendre l'écran jusqu'en bas, puis
  remonter, puis redescendre : un va-et-vient qui se lit comme un bug, **introduit par un
  correctif de lisibilité**. Mesuré après coup au panneau, défilement à chaque bulle :
  **0 → 365 → 556 → 702 → 1045 px**, puis retour à 0 pour la roue, qui est en haut et où le
  tour se termine. ➡️ **Déplacer un élément du Profil, c'est aussi relire `lib/tours.ts`.**

  🔒 **Garde-fou : `lib/__tests__/profilSection.test.ts`** (8 cas), sur le patron des scans
  de source de `tags.test.ts` / `feuilles.test.ts`. Il compte : aucun titre de section ne
  porte le nom de la feuille qu'ouvre la roue · la roue est annoncée sous le nom de ce
  qu'elle ouvre (sinon on « corrigerait » le premier cas en débaptisant le bouton) · les
  deux blocs sont au même niveau · aucune route n'est poussée par deux lignes · aucune
  adresse recopiée · **les étapes du tour suivent l'écran, la dernière exceptée** · la
  dépense est rendue avant le premier bloc de menu.
  ✅ **Vérifié par SIX mutations**, chacune vue rougir puis restaurée : le titre
  « Réglages » remis (3 cas rouges) · la ligne « Aide & contact » réintroduite (1) · une
  adresse recopiée en dur (1) · la roue débaptisée (1) · l'étape TDEE remise en
  avant-dernier (1) · le bloc TDEE redescendu sous les menus (2).
  📊 `tsc` vert ; le compte de tests de ce lot est repris dans E31 (les deux ont été re-mesurés ensemble après rebase sur `main`).

- ~~**E32 · Un objectif à douze mois ne renforçait rien pendant douze mois — les paliers**~~
  *(numérotés E30–E32 et non E26–E28 : `main` avait pris E26 pour le consentement
  analytics pendant que cette branche vivait, et E29 pour le mouvement. Le chantier
  DÉJÀ MERGÉ garde son numéro — renuméroter de l'histoire partie est pire que tout.
  Les trois se déplacent EN BLOC parce qu'ils se citent entre eux.)*
  ✅ **LIVRÉ le 2026-08-10.** Aucun `ENGINE_REV` : **pas une calorie ne bouge.**

  Au-delà de 15 kg d'écart **ou** de 6 mois de trajectoire, la carte d'objectif met en
  avant l'étape suivante (~9 kg) au lieu de la cible lointaine, avec sa date et sa
  jauge. `lib/goalMilestones.ts` — module PUR, sans import d'écran, comme `goalLadder`.

  🔴 **C'EST UNE VUE, ET C'EST TOUTE LA DÉCISION DU CHANTIER.** Le geste évident est de
  poser le palier dans `goal_target` : le moteur piloterait vers lui, la date serait
  proche, tout serait cohérent. `npm run mesure:paliers` dit que c'est un piège, et il
  ne se voit **que sur les gros écarts** — donc précisément sur la population visée :

  | corps | écart | objectif final | palier | delta |
  |---|---|---|---|---|
  | H 105 → 85 | 20 kg | 2006 kcal | 2006 | **0** |
  | F 95 → 78 | 17 kg | 1607 kcal | 1607 | **0** |
  | H 123 → 85 | 38 kg | 2045 kcal | 2291 | **+246** |
  | F 120 → 80 | 40 kg | 1751 kcal | 1968 | **+217** |

  Sur 38 kg le rythme servi tomberait de **0,60 à 0,40 kg/sem**. Cause : une date proche
  redevient « tenable » au calcul EN LIGNE DROITE (`diff / weeksRemaining`), donc A15
  cesse de servir le rythme sûr maximal et retombe sur le « juste requis » — qui
  sous-estime, l'arrivée étant SIMULÉE. **Le défaut A15 réintroduit par la porte de
  derrière.** Un panel de gabarits ordinaires aurait rendu 0 partout et validé le piège.

  🔴 **LA MESURE ELLE-MÊME S'EST TROMPÉE DEUX FOIS, et les deux dans le sens rassurant :**
  1. datée à 4 ans « pour éviter le régime A15 », elle rendait un écart de 21 kcal — sauf
     qu'à 4 ans, 38 kg ne demandent que 0,18 kg/sem : les deux objectifs comparés étaient
     également mous et l'écart n'était qu'un arrondi de date. **Éviter un régime, c'est en
     choisir un autre** ;
  2. le garde `maxRateApplied` écartait **5 corps sur 5**. Ce drapeau ne se lève que quand
     le moteur BASCULE d'un rythme requis trop mou vers le maximum ; avec une date
     agressive le maximum est servi par le chemin ORDINAIRE, donc rien à basculer. Le bon
     témoin du régime est `clamped`.
  ➡️ *Une mesure qui rend « aucun écart » mérite qu'on vérifie qu'elle regarde le bon
  régime — et une qui ne rend AUCUNE ligne mérite qu'on soupçonne son garde, pas la donnée.*

  ⚠️ **Les dates de palier sont lues sur la trajectoire SIMULÉE**, jamais interpolées :
  la ligne droite est ce que §10 interdit nommément. Les intervalles s'allongent donc
  d'eux-mêmes (dépense qui baisse, pause toutes les 9 semaines). **Vérifié par mutation** :
  remplacer les dates par une interpolation linéaire fait rougir le test.
  ⚠️ **Le palier courant se LIT du poids actuel** — franchi puis reperdu, il redevient
  courant. Le stocker serait la « copie que personne ne relit » de §10.
  ⚠️ **La cible finale reste affichée** : la masquer, comme le proposait le brief,
  déciderait à la place de la personne ce qu'elle a le droit de savoir de son objectif.

  ✅ Garde-fous : `lib/__tests__/goalMilestones.test.ts` (14 tests), dont l'invariant
  « découper ne déplace aucune calorie » — celui qui empêchera la prochaine session de
  « simplifier » en posant le palier dans `goal_target`.

- ~~**E31 · Rien ne sortait plus personne d'une sèche — la pause à la maintenance**~~
  ✅ **LIVRÉ le 2026-08-10** (décision fondateur, même `ENGINE_REV` 7 qu'E30).
  🔴 **MIGRATION À JOUER** : `supabase/migrations/2026-08-10_profiles_deficit_weeks.sql`.

  **Pourquoi.** E30 a retiré les planchers dérivés de la masse maigre au-dessus du seuil
  d'adiposité, et avec eux l'escalade RED-S — la seule chose qui forçait une sortie de
  déficit. Sans relève, on pouvait sécher indéfiniment. ⚠️ **Et le trou était plus vieux
  que ça** : `effectiveEaPerKgFfm` n'escalade que pour `isFemaleAtRisk`. **Un HOMME n'a
  jamais eu, à aucune adiposité, aucun mécanisme le sortant d'une sèche** — il pouvait
  creuser trois ans. Invisible parce que le plancher le plafonnait à 0,3 kg/semaine.
  *C'est un test EXISTANT qui l'a dit en rougissant* (« sa cible ne bouge pas d'un kcal
  en 24 semaines » — vrai, et c'était précisément le défaut).

  **Livré.** Après 8 semaines de déficit d'affilée, la 9ᵉ est servie à la maintenance.
  Registre `deficit_weeks`, même forme que `low_ea_weeks` (donc aucune machinerie neuve)
  mais prédicat CONSÉCUTIF et non cumulé. **Aucun champ « pause en cours »** : pendant la
  pause le plan n'est pas un déficit, donc la semaine n'entre pas au registre, donc la
  série repart de zéro — l'état est entièrement porté par le registre.

  🔴 **UNE SEULE PROTECTION PAR PERSONNE (`dietBreakApplies`), appris en cassant.**
  Livrée sans ce prédicat, la pause DÉSARMAIT l'escalade : pendant une pause le plan
  n'est plus restrictif, `since` retombe à null, et l'escalade n'arrive jamais à son
  terme. Trois tests rouges d'un coup, dont « la remontée annoncée vaut exactement la
  hausse réelle » — la carte qui promet « ta cible montera de X par semaine jusqu'à la
  semaine N » devenait fausse. **Un garde-fou qui désarme l'autre est pire que pas de
  second garde-fou.** La pause va donc là où l'escalade ne peut rien : tout homme, et
  quiconque au-dessus du seuil d'adiposité.

  🔴 **LA PAUSE A DURÉ 2 SEMAINES PENDANT TOUTE LA PREMIÈRE VERSION.** Ni la relecture
  ni la suite de tests ne l'ont vu — seule une trace semaine par semaine l'a montré.
  `settleLowEaExposure` solde le temps écoulé depuis `since`, **semaine courante
  comprise** : juste pour la zone basse, faux pour le déficit, où ça réinscrivait la
  semaine de pause AVANT que le plan de pause soit calculé. Série = 9 la semaine
  suivante, pause repartie pour un tour. Cadence réelle 8+2 quand tout le code et toute
  la doc annonçaient 8+1. ➡️ `forgetCurrentWeek`, sur le SEUL registre de déficit.
  *« Vérifier le résultat, pas la mécanique », littéralement.*

  ⚠️ **La projection simule les pauses** (`WeeklyProjector.dietBreak`) : sinon la date
  annoncée décrit une sèche sans pause quand le moteur en sert une toutes les 9 semaines
  — **~11 %** d'écart, défaut A15/P1.6 rejoué. ⚠️ **Et une pause n'est pas un ARRÊT** :
  à la maintenance le rythme vaut ~0, le test « à l'arrêt » du simulateur renvoyait
  `Infinity` (« aucune date ») pour une semaine PRÉVUE sur une sèche saine.

  ➡️ **Question ouverte** : l'escalade RED-S est décrite ici même comme déroutante (« ses
  calories augmentent toutes les semaines : l'app dérive »), au point d'avoir exigé une
  carte d'explication. La pause est probablement le meilleur mécanisme pour tout le
  monde. **La substituer est une décision de sécurité à part entière**, pas un effet de
  bord de ce chantier.

  ✅ Garde-fous : `lib/__tests__/pauseMaintenance.test.ts` (15 tests), **vérifiés par
  2 mutations** (retrait de `forgetCurrentWeek` → 2 rouges ; pause désactivée dans la
  projection → 1 rouge). Carte d'explication sur le Profil (ton §10 : la pause est un
  acquis, la fin est annoncée dès la première phrase, aucun bouton — il n'y a rien à faire).

- ~~**E30 · Le plancher d'énergie disponible plafonnait TOUT LE MONDE à 0,3 kg/semaine**~~
  ✅ **LIVRÉ le 2026-08-10** (décision fondateur), `ENGINE_REV` 6 → 7.

  **Ce que la mesure a trouvé, et ce n'est pas ce qu'on cherchait.** Le point de départ
  était un brief affirmant que le moteur s'INVERSE avec l'adiposité (« plus on est gras,
  moins il autorise à perdre »). `npm run mesure:plancher` dit le contraire : le déficit
  permis MONTE légèrement avec le %MG (318 → 375 kcal/j). Mais il dit surtout que le
  plancher d'énergie disponible gagnait **15 fois sur 15**, de 15 à 45 % de MG, chez les
  deux sexes — donc que le plafond de rythme gradué par l'adiposité (`maxWeeklyLossPct`)
  et le cap à 25 % du TDEE ne mordaient **jamais**. Deux garde-fous entièrement
  décoratifs, et tout le monde plafonné à **0,30–0,34 kg/semaine** : un homme de 123 kg
  mettait ~2,5 ans à descendre à 85 kg. **Le défaut était uniforme, donc bien plus gros
  que celui qu'on croyait corriger.**

  ⚠️ **Et s'entraîner ne rapportait RIEN** : la dépense sportive s'ajoute au TDEE **et**
  au plancher EA, et s'annule exactement — 0 séance et 4 séances donnaient 327 kcal/j au
  kcal près. C'est la définition du seuil (manger plus quand on brûle plus), mais aucun
  écran ne le disait, et le brief de départ affirmait l'inverse (« l'ajout d'activité est
  la seule voie »). ⚠️ **Sous le seuil, c'est toujours vrai.**

  **Livré** : au-delà de 30 % de MG (H) / 40 % (F), les deux planchers dérivés de la
  masse maigre se retirent (`safety.ts::highAdiposity`, `HIGH_ADIPOSITY_PCT`) et le cap à
  25 % du TDEE prend le relais. Mesuré après : **inchangé sous le seuil** (0,29 → 0,32),
  0,30 → **0,62** kg/sem pour le H 123 kg, 0,35 → **0,44** pour une F 95 kg à 45 %, et le
  sport achète enfin quelque chose (0,62 → 0,69 à 4 séances).

  🔴 **CE QUE ÇA RETIRE, ET QUI EST À ASSUMER** : au-dessus du seuil, l'escalade RED-S ne
  force plus la sortie de déficit à 12 semaines. Le budget de zone basse **cesse de se
  consommer** (`countsAsLowEaWeek`) — sans ça il reviendrait **déjà épuisé** le jour où
  la personne repasse sous le seuil et la sortirait du déficit au moment où sa sèche
  redevient ordinaire, sans qu'aucun geste de sa part ne l'explique. Défaut dormant type.
  ✅ **La relève est LIVRÉE le même jour — voir E31 juste au-dessus.**

  ⚠️ **Le %MG GELÉ, corrigé à moitié — et la moitié laissée l'est pour une raison
  mesurée.** `maxWeeklyLossPct` lit le %MG, qui ne bouge que si la personne le ressaisit :
  un homme parti de 123 kg à 35 % gardait le plafond de 1,25 %/semaine jusqu'à 85 kg. Pour
  que ce soit légitime il faudrait qu'il porte encore 25,5 kg de gras — donc que **20,5
  des 38 kg perdus aient été du muscle**. Le plafond de rythme suit désormais le poids
  projeté (`safety.bodyAtWeight` + `bodyFatPctAtWeight`, borne BASSE : « on ne peut pas
  perdre plus de gras que de poids », donc bande la plus stricte, **aucune constante
  physiologique introduite**).
  🔴 **Mais PAS la dépense, et l'essayer casse tout** : le %MG produit la masse maigre,
  donc le plancher EA. La borne implique une masse maigre CONSTANTE, donc un plancher qui
  ne descend plus — mesuré, `F 78 → 65 kg` n'a plus **aucune** échéance atteignable sur
  5 ans et l'échelle d'échéances rend une rangée vide. ➡️ **Une même hypothèse,
  conservatrice dans les deux sens, et le second sens n'était pas le défaut** : sur le
  rythme, conservateur = plus strict = sûr ; sur le plancher, conservateur = plancher plus
  haut = objectif inatteignable.
  ➡️ **Reste ouvert** : en vraie vie le %MG reste celui de la saisie. Le faire suivre
  demanderait soit de stocker le poids auquel il a été mesuré (**migration**), soit de le
  redemander. Non tranché.

  ⚠️ **Deux causes dans une même révision, une première** — d'où `EngineNotice.cause` :
  les planchers retirés et la fusion `bulk` touchent des gens différents et font toutes
  deux BAISSER la cible, donc ni la révision ni le signe ne les séparent. Sans ce champ
  l'écran servait à l'un l'explication de l'autre.

  ✅ Garde-fous : `safety.test.ts` (3 tests neufs — au-delà du seuil, **les deux côtés de
  la frontière**, et le budget qui ne se consomme pas), **vérifiés par 2 mutations**
  (`highAdiposity` forcé à `false` → 4 rouges ; forcé à `true` → 21 rouges). Contrôle :
  `npm run mesure:plancher`. **Aucune migration Supabase** (`cause` vit dans le jsonb
  `engine_notice`, aucun objectif ajouté à l'énumération).
- ~~**E29 · Le MOUVEMENT est le seul axe de DA sans règle ni garde-fou**~~ ✅ **LIVRÉ le
  2026-08-10 par E35**, sauf le constat **#8** (le pont de défilement des feuilles), seul
  des neuf à exiger la bibliothèque d'animation moderne.

  🔴 **ET LE VERROU DE PUBLICATION CI-DESSOUS EST DEVENU SANS OBJET POUR CE QUI EST
  LIVRÉ.** Il servait à trancher UNE question : peut-on se servir de Reanimated sans
  risquer que l'app ne s'ouvre plus ? Le chantier a pris l'autre chemin — tout est écrit
  avec le CŒUR de React Native (`Animated.spring` accepte `velocity`, `AccessibilityInfo`
  et `Pressable` sont natifs), donc **aucune ligne mergée ne dépend de ce paquet** et le
  risque que ce contrôle devait écarter n'existe pas. ➡️ Le contrôle IPA reste à faire
  **le jour où on voudra #8 ou l'interruption sur le fil UI**, pas avant. Ne pas le
  présenter comme une dette du chantier livré : c'est la porte d'un chantier qu'on n'a
  pas ouvert.

  *Ce qui suit est l'audit d'origine, conservé pour son raisonnement et ses mesures.*

- 🤖 **E29 (audit d'origine) · Le mouvement, axe sans règle ni garde-fou (2026-08-10)**

  ⚠️ *Numérotée **E26** à l'écriture, et le choix était juste ce matin-là : E25 était le
  dernier pris sur `main`. La session « consentement analytics » a mergé E26 pendant
  celle-ci. **E27 et E28 sont pris eux aussi, par deux PR encore OUVERTES** (#74, #75) —
  d'où E29 et non E27 : le numéro se choisit en regardant `main` **ET** les branches en
  aval, sinon renuméroter propage la collision au lieu de la clore. Quatrième collision
  du même type, cf. E19/E20, A28/A29 et A29/A30.*

  Quatre axes de la DA ont reçu un rôle, un token et un test : la forme (`rayonsDA`),
  le texte (`typoDA`), le blanc (`espacementDA`), les finitions (`finitionsDA`). Le
  cinquième — **ce qui bouge et ce qui se sent** — n'a **rien** : ni token de durée, ni
  token de courbe, ni test. Il a donc dérivé exactement comme les quatre autres avant
  leur passe, et pour la même raison : rien ne l'obligeait.

  🔴 **L'ARBITRAGE EST TRANCHÉ : C'EST DE L'OTA, PAS UN BUILD — et le brief qui a ouvert
  ce chantier se trompait sur ce point.** Il annonçait quatre dépendances natives
  absentes « même en transitif », donc un build et une coupure de la ligne OTA (§2).
  Mesuré le 2026-08-10, c'est faux pour les deux qui portent tout le travail :

  | | déclarée | dans `node_modules` | dans le binaire livré |
  |---|---|---|---|
  | `react-native-reanimated` **4.4.1** | non | **oui**, via `expo-router` | **oui** — `ios/Podfile.lock` |
  | `react-native-gesture-handler` **3.0.2** | non | **oui**, via `expo-router` | **oui** — `ios/Podfile.lock` |
  | `react-native-worklets` **0.9.2** | non | **oui** | oui |
  | `expo-haptics` | non | **non** | **non** |
  | `expo-blur` | non | **non** | **non** |

  La chaîne de preuve, chaque maillon mesuré : `expo-router` (dépendance DIRECTE) tire
  les trois · `ios/` est **gitignoré**, donc EAS refait un prebuild depuis
  `node_modules`, donc l'autolink les embarque · `ios/Podfile.lock` porte bien
  `RNReanimated (4.4.1)` et `RNGestureHandler (3.0.2)` · et le **lock du commit de la
  soumission de revue** (`0f54ee7`, 2026-08-03) les contenait déjà tous les trois.
  ➡️ **Le binaire 1.0.0 (3) que les testeurs ont sur leur téléphone contient déjà le
  natif.** S'en servir depuis le JS n'ajoute aucun natif, donc **ne coûte ni build ni
  revue** : `runtimeVersion` reste `1.0.0`, l'update atterrit sur le binaire existant.

  Et le socle est là, entier, sans une ligne de configuration à écrire :
  - **Nouvelle architecture ACTIVE** (`RCT_NEW_ARCH_ENABLED=1`, RN 0.85.3) — c'est
    l'exigence dure de Reanimated 4, elle est satisfaite ;
  - **`babel-preset-expo` ajoute le plugin worklets tout seul** dès que
    `react-native-worklets` se résout (`configs/expo.js:109`) — d'où l'absence de
    `babel.config.js`, qui n'est pas un manque ;
  - `SpringConfig` expose **exactement le modèle Apple** : `dampingRatio` + `duration`
    (= amortissement + réponse), plus `velocity` — les trois paramètres dont le chantier
    a besoin, sans conversion ;
  - `reduceMotion` vaut **`ReduceMotion.System` par défaut** : migrer vers `withSpring`
    fait respecter « Réduire les animations » **gratuitement**.

  ⚠️ **Ce qui reste vraiment natif, et attend donc le build 1.0.0 (4) déjà prévu** :
  `expo-haptics` (le retour au doigt) et `expo-blur` (le flou de la barre compacte, déjà
  écarté une fois pour ce motif exact — `CollapsingTitle.tsx:25`). Ni l'un ni l'autre ne
  bloque le reste : ils s'agrafent au train quand il part.

  ⚠️ **Le coût à mesurer AVANT de pousser, et il n'est pas nul** : importer Reanimated
  depuis nos écrans le fait entrer dans le **bundle web**, qui aujourd'hui ne le contient
  pas (aucun de nos fichiers ne l'importe). Même piège que `react-native-purchases`
  (+900 Ko, §11) : un import statique embarque, une garde à l'exécution ne retire rien.
  ➡️ Mesurer sur l'artefact (`npm run build:web`), pas sur l'intention, et prévoir une
  **séparation de plateforme** (`.web.ts`) si le poids ne passe pas.

  **L'audit, priorisé par levier (impact ÷ effort).** Périmètre re-compté le 2026-08-10 :
  **7 fichiers sur 55** animent quoi que ce soit ; 16 `Animated.timing`, 8
  `Animated.spring`, 0 `LayoutAnimation`.

  | # | Gravité | Où | Le défaut, mesuré |
  |---|---|---|---|
  | 1 | 🔴 | `Sheet.tsx:111` · `ActionSheet.tsx:88` | **La vitesse du doigt est lue puis JETÉE.** `g.vy > 0.4` décide *si* on ferme ; la sortie qui suit dure **240 / 200 ms fixes**, qu'on ait effleuré ou balancé la feuille. C'est l'écart Apple le plus visible — chez Apple le mouvement HÉRITE de la vitesse (`withSpring(…, { velocity })`) |
  | 2 | 🔴 | 12 des 16 `Animated.timing` | **Aucune courbe n'est déclarée**, donc RN applique `easeInOut` (`TimingAnimation.js:77`, vérifié). Toute entrée et toute sortie de feuille **démarre lentement** — la moitié d'une courbe `ease-in`, que le catalogue classe « toujours un défaut » sur de l'UI. Il faut `ease-out` |
  | 3 | 🔴 | partout | **« Réduire les animations » est ignoré** — `AccessibilityInfo` : **0 fichier**. Réglage d'accessibilité iOS, et Apple le teste. Le pire cas est le confetti de `BirthdayCelebration` (**2 200 ms**, 12 éléments décalés) |
  | 4 | 🟠 | 125 emplois d'`OPACITE_PRESSION` | **Un bouton pâlit, il ne s'enfonce pas.** Seul retour à l'appui : opacité 0,7. Apple attend `scale(0.97)` sur l'appui, en 100–160 ms. ⚠️ 127 `<TouchableOpacity>` contre 10 `<Pressable>` — et c'est `Pressable` qui donne l'état pressé |
  | 5 | 🟠 | `Sheet.tsx:109` · `ActionSheet.tsx:86` | **Aucun caoutchouc.** `if (g.dy > 0)` : tirer une feuille vers le HAUT ne fait rien. Elle est morte au doigt au lieu de résister progressivement |
  | 6 | 🟠 | `Sheet.tsx:64-68` | **L'ouverture n'est pas interruptible.** `ty.setValue(screenH)` puis un `timing` : saisir une feuille pendant qu'elle monte produit un saut. Un ressort part de la valeur COURANTE, c'est tout l'intérêt |
  | 7 | 🟠 | 5 fichiers | **Aucun token de mouvement.** 7 durées distinctes écrites à la main (200 · 220 · 240 · 260 · 300 · 500 · 550) et **zéro** entrée « durée » ou « courbe » dans `theme.ts`. C'est le défaut de `rayonsDA` avant sa passe, rejoué |
  | 8 | 🟡 | `Sheet.tsx:148-153` | `scrollEventThrottle: 16` + `ty.setValue()` fait passer **chaque frame** de défilement par le pont JS. `useAnimatedScrollHandler` fait le même travail sur le fil UI |

  ⚠️ **Les 8 ressorts existants ne sont pas 8 décisions** : 3 « pop » d'entrée sur les
  célébrations (`bounciness` 7 / 9 / 10, légitimes — moment rare, budget de plaisir
  autorisé) et **5 fois exactement le même rattrapage** (`toValue: 0, bounciness: 2`)
  qui remonte une feuille quand le glissement n'a pas suffi. **Aucun ressort ne pilote
  une ouverture ni une fermeture.**

  🚫 **Ce que ce chantier ne fait PAS.** Les **48** fichiers muets **restent muets** :
  animer parce que ça n'anime pas est le contraire du geste. La retenue est la règle, et
  les 4 seules occasions repérées valent d'être écrites — l'appui (#4, qui les couvre
  toutes), la feuille (#1/#5/#6), la bascule du titre compact (déjà faite, 160 ms, et
  documentée comme délibérée : ne pas y toucher), et rien d'autre. Ne pas non plus
  rouvrir couleur / rayon / typo / espacement : c'est fait et verrouillé par 6 tests.

  🔴 **LES TROIS PIÈGES DE VÉRIFICATION TOMBENT TOUS LES TROIS SUR CE CHANTIER**, et ils
  sont déjà payés ailleurs dans ce fichier :
  1. **Un geste ne se vérifie pas dans le navigateur** (§5). Le glissement des feuilles
     était mort en natif **depuis le commit initial** et le web l'a caché des mois.
  2. **`requestAnimationFrame` ne tourne pas dans le panneau navigateur** — 0 frame en
     7,2 s, mesuré. Une animation s'y fige à une valeur intermédiaire **plausible**, et
     on part corriger du code sain. Un chantier d'animation vérifié là ne prouve **rien**.
  3. **Depuis un worktree, le preview sert l'app du dépôt PRINCIPAL** (§11).
  ➡️ Simulateur (`npx expo run:ios`, capture par `xcrun simctl io booted screenshot`), et
  **sortir chaque décision en fonction PURE testée** — comme `lib/collapsingTitle.ts` et
  `lib/accentColor.ts`. C'est le seul mouvement vérifiable sans simulateur. Et **dire dans
  la PR ce qui n'a pas été vu à l'écran**.

  🔴 **VERROU DE PUBLICATION — à lever AVANT le premier `eas update` de ce chantier,
  pas avant d'écrire le code.** Toute la démonstration ci-dessus parle du **dépôt** (un
  `Podfile.lock` de prebuild local, un lockfile, une config) ; aucune ligne ne parle de
  **l'artefact qu'Apple a traité**. Le maillon non observé est le build qu'EAS a
  réellement fait tourner.
  ⚠️ **Et le symptôme d'une erreur ici n'est pas discret** : sans sa partie native,
  Reanimated **lève au démarrage** — l'app ne s'ouvre plus du tout, chez tout le monde,
  en quelques minutes, sans revue pour l'arrêter. C'est le seul défaut de ce chantier
  qui coûte plus cher qu'un rollback.
  ➡️ Télécharger l'IPA du build depuis EAS et chercher les symboles dans le binaire —
  ce sont des identifiants **ASCII purs**, donc le piège `strings` de §2 ne mord pas ici :
  ```bash
  unzip -q -o build.ipa -d /tmp/ipa && strings -a /tmp/ipa/Payload/*.app/Kyroz | grep -cE "REAModule|RNGestureHandlerModule"
  ```
  **0 = l'arbitrage OTA est faux et il faut un build.** Non-zéro = confirmé sur l'objet
  réel. Le contrôle est gratuit et n'atteint personne.
  ⚠️ **Ne PAS le remplacer par « une petite OTA de test »** : le build 3 est sur le canal
  `production`, donc une mise à jour dessus atteint aussi la testeuse externe — ce n'est
  pas un essai à blanc.

  ⚠️ **Le garde-fou de sortie sera un test, pas un paragraphe** — c'est la leçon de la
  passe émoji, qui s'est déclarée finie trois fois avant de l'être. À compter : aucune
  durée de mouvement en dur, aucune `Animated.timing` sans courbe explicite, et
  `feuilles.test.ts` (3 cas) étendu à la vitesse héritée.

  ⚠️ *Les deux chiffres du brief d'ouverture qui étaient faux, notés pour qu'on ne les
  recopie pas : « 288 `TouchableOpacity` » comptait les **occurrences** (import + balise
  ouvrante + fermante = 284 aujourd'hui), pas les **instances** — il y en a **127**. Et
  « 7 fichiers sur 60 » : le périmètre `app/` + `components/` en compte **55**. Même
  famille que l'inventaire émoji juste sur le mauvais périmètre (§8).*
  ⚠️ *Et « 53 fichiers muets » en était DÉRIVÉ (60 − 7). Corrigé ici en **48** (55 − 7) :
  la correction d'un chiffre doit descendre jusqu'à ceux qu'il a engendrés, sinon le faux
  survit dans sa descendance. Même motif que les cinq nombres de `dailyBudget` devenus
  faux « sans que le module bouge » (§6).*

  ➡️ **ADDENDUM du 2026-08-10 — audit croisé, session parallèle
  (`apple-motion-skills`).** Refait indépendamment avec `apple-design` +
  `improve-animations`, il **confirme les 8 constats ci-dessus** (mêmes fichiers, mêmes
  lignes) et n'ajoute que ceci :

  🔴 **LE VERROU DE PUBLICATION A UNE ISSUE DE SECOURS, et elle est OTA aussi.** Le
  contrôle IPA ci-dessus conclut « 0 = il faut un build ». **C'est trop dur** : mesuré sur
  la RN 0.85.3 installée, le cœur de React Native — donc **déjà dans tout binaire, sans
  aucun paquet** — sait faire l'essentiel :
  - `Animated.spring` accepte **`velocity`**, et `stiffness` / `damping` / `mass`
    (`SpringAnimation.js:45,73-76`) → la **vitesse héritée** (#1) et les ressorts sur
    ouverture/fermeture (#6) ne dépendent PAS de Reanimated ;
  - `AccessibilityInfo.isReduceMotionEnabled()` + l'événement `reduceMotionChanged` sont
    dans le cœur (`AccessibilityInfo.d.ts:18,71`) → **#3 se traite sans rien installer**,
    et sans dépendre du `ReduceMotion.System` de Reanimated ;
  - `Pressable` est dans le cœur → **#4 aussi**.
  ➡️ Donc si l'IPA rend 0, **le chantier n'est pas bloqué** : il se fait en `Animated`, et
  seuls #8 (le pont de défilement) et l'interruption vraie sur le fil UI attendent le
  build. Reanimated reste le meilleur outil ; il n'est pas le seul.

  ⚠️ **Un 9ᵉ constat, absent de la liste : le DOUBLE FONDU des trois célébrations.**
  `FirstPlanReveal`, `StreakCelebration` et `BirthdayCelebration` posent
  `animationType="fade"` sur leur `Modal` **et** animent leur propre `opacity` 0→1.
  Deux fondus superposés de durées différentes sur le même objet. `Sheet` et `ActionSheet`
  sont corrects (`animationType="none"`) — le défaut n'est que sur les trois célébrations.

  ⚠️ **Piège d'unités, à connaître avant d'écrire #1** : `vy` de `PanResponder` est en
  **px/milliseconde** (`PanResponder.js:361`) et un ressort intègre en **secondes**
  (`SpringAnimation.js:281`) → `velocity: g.vy * 1000`. Se tromper est un facteur 1000.
  ℹ️ Le piège **disparaît** en migrant vers `gesture-handler`, dont `velocityY` est déjà
  en px/seconde — donc il ne mord que sur les chemins qui gardent `PanResponder`, ce qui
  sera le cas si la migration est incrémentale.
- ~~**E26 · Le consentement analytics gâchait l'écran d'arrivée, et mesurait des données de santé**~~ ✅ **LIVRÉ le 2026-08-10.**
  *Décision fondateur : « enlever ce popup au-dessus du plan alimentaire […] le mettre
  autre part, mieux expliqué et à un meilleur moment ».*
  ⚠️ *Numéro pris sur une branche : le vérifier contre `main` au moment de fusionner.*

  **Deux défauts, pas un.** La PLACE (une carte de consentement en tête de l'écran Plan,
  la première chose vue à l'arrivée) et le MOMENT (juste après le premier plan, pile sur
  l'instant que tout l'onboarding sert à préparer). Un troisième, trouvé en chemin, était
  plus grave que les deux : `onboarding_completed` envoyait `goal`, `restrictions` et
  `has_sport` — **objectif, régime et pratique sportive, trois données de santé (art. 9)**,
  depuis le tout premier commit du fichier. **Défaut DORMANT** : sans clé PostHog rien ne
  partait, donc rien ne se voyait. Il se serait allumé le jour de la pose de la clé.

  **Ce qui est livré** — `components/AnalyticsConsentStep.tsx`, un écran plein posé
  **AVANT l'assistant** (après le dépistage santé, avant l'étape 1), qui dit ce qui est
  mesuré et ce qui ne l'est jamais, avec deux boutons de MÊME taille. L'écran Plan n'est
  plus touché. Les events passent de 7 à **13**, tous porteurs de `jour_depuis_install`.

  🔴 **LE MOMENT EST STRUCTURANT, PAS COSMÉTIQUE.** `capture()` ne garde RIEN avant la
  réponse et le tampon local a été écarté (§3.2 de la synthèse). Tout ce qui précède le
  consentement est donc perdu **pour tout le monde, définitivement**. Demander après le
  premier plan aurait supprimé d'un coup la décision D1 (« où l'inscription
  décroche-t-elle ? ») — or un décrochage d'onboarding est justement le seul signal
  lisible à 40 utilisateurs, là où la rétention demande des mois.
  ➡️ **Déplacer cet écran plus tard, c'est supprimer D1. Pas la dégrader : la supprimer.**

  ⚠️ **La synthèse d'arbitrage se CONTREDIT sur `onboarding_blocked`**, et c'est §6 qui
  gagne : son §5 proposait `motif: age | volume | autre`, son §6 interdit « tout motif de
  blocage lié à » l'âge, au sport ou à l'IMC. L'event part donc **sans aucune propriété** —
  le compte seul répond à la question posée, et le pourquoi ne changerait aucune décision
  (ces garde-fous ne sont pas négociables). Même famille : `origine: recalage` proposé pour
  `plan_regenerated` ne correspond à **aucun chemin du code** (recaler sa journée
  rééquilibre les repas, ça ne régénère pas) — il aurait créé un zéro qu'on aurait fini par
  lire comme « personne ne recale ».

  ⚠️ **`duree_generation_ms` chronomètre LE MOTEUR, pas la pause de transition de 600 ms.**
  Les additionner rendrait ~608 ms à chaque fois : une régression du moteur (8 → 80 ms) se
  lirait 608 → 680, noyée dans une constante qu'on a choisie nous-mêmes. Mesuré à l'écran :
  **25 ms**.

  ➡️ **Garde-fou : `lib/__tests__/analyticsPerimetre.test.ts`**, vérifié par **4 mutations**
  (remettre `goal` · lire `profile.` sous un nom innocent · ajouter un 14ᵉ event · écrire un
  nom d'event à la main). Il compte les noms de propriétés interdits, interdit toute lecture
  de `profile.` dans un bloc d'event, fige la liste des 13, et vérifie que tout event envoyé
  existe dans `Events`. Sans lui, ces règles restaient un paragraphe de .md — et c'est
  exactement comme ça que `goal` a survécu si longtemps.

  ✅ **TEXTES FAITS LE 2026-08-18 — la clé, non** (et l'ordre s'est inversé pour une raison :
  l'app demandait déjà le consentement en production pour un outil que les textes déclaraient
  inexistant ; ce n'était plus « anticiper », c'était corriger un énoncé faux) :
  - [x] `constants/legal.ts` — §2, §3, §4, §5, §7, §9 : PostHog nommé, stockage à Francfort,
        consentement distinct et refusable, 18 mois. Écrit au **conditionnel de consentement**
        (« si vous acceptez »), jamais au conditionnel d'existence → vrai clé posée ou non.
  - [x] `public/legal.html` — **généré** (`npm run gen:legal`), plus recopié
  - [x] `docs/politique-confidentialite-kyroz.md` — **généré** aussi
  - [x] `RGPD-REGISTRE.md` — **traitement n°2** séparé (finalité, base légale, données,
        destinataire et durée diffèrent tous du n°1), les 5 sous-traitants ultérieurs avec
        leur date de consultation, l'IP consignée comme collectée, les 3 verrous
  - [x] `STORE-RELEASE.md` §4 — **5ᵉ surface, trouvée le 2026-08-18** : les deux formulaires
        (Apple *Product Interaction* + Google *actions dans l'app*) et l'URL de politique
  - [x] `kyroz.app/legal.html` — **6ᵉ surface**, dépôt séparé `kyroz-site`. Elle mentait
        depuis deux mois (16 ans au lieu de 18, Resend absent) : personne ne l'avait rouverte
  - [x] garde-fous : PostHog nommé · « outil d'analyse tiers » absent · « anonyme » banni ·
        aucun gabarit `[Majuscule]` — 4 assertions, vérifiées par mutation
  - [ ] 🔴 **`docs/politique-confidentialite-kyroz.md` — la QUATRIÈME surface, que le §8 de la
        synthèse ne compte pas.** Elle n'affirme rien de faux aujourd'hui (elle ne parle pas
        du tout d'analytics), donc elle échappe à toute recherche de la phrase à corriger —
        c'est un **manque**, pas un mensonge, et un manque ne se grep pas. Or c'est la
        version destinée à l'URL publique exigée par les stores : le paragraphe est à
        **AJOUTER**, pas à modifier. *(Un inventaire juste sur le mauvais périmètre : le §8
        a listé les trois textes qui portaient la phrase, pas les surfaces qui la devront.)*
  - [ ] côté PostHog : **couper la collecte d'IP** (le client n'envoie rien pour ça, donc le
        défaut serveur s'applique — géolocalisation comprise), rétention à 18 mois, DPA signé
  - [x] les **seuils** du §10 — ÉCRITS le 2026-08-10 : D1 une étape qui perd > 20 % (4 sem.,
        ≥ 50 entrées) · D2 médiane < 4 jours actifs sur 14 après 3 cohortes · D4 **−8 points
        entre deux cohortes** · D6 ≥ 3 échecs en 7 j, ou ≥ 1 % passé 500 générations/sem.
        ⚠️ **D4 est une TENDANCE et pas un absolu, et c'est un correctif** : la première
        version proposait « ratio sous 25 % », ce que le §5 du même document interdit —
        `meal_cooked` mesure un TAP, donc un ratio absolu bas peut décrire un produit qui
        marche avec des gens qui ne cochent pas. ⚠️ D2 nomme sa définition (`plan_opened`)
        parce que le §4.2 en laisse deux ouvertes — et **l'écart entre les deux est
        justement la donnée qui tranchera §4.2**.

  📄 `docs/2026-08-10-brief-analytics-perimetre.md` (le brief) et
  `docs/2026-08-10-synthese-analytics-arbitrage.md` (l'arbitrage qui fait foi).

- ~~**E25 · Le Profil était une section fourre-tout**~~ ✅ **LIVRÉ le 2026-08-10.**
  *Décision fondateur du 2026-08-09 : « j'aimerais que le profil soit qu'avec les
  préférences et données de l'user, suivi du poids etc, et avec une petite roue dentée
  on met le reste ». Et, dans la foulée, « une section commentaire digne de ce nom ».*
  ⚠️ *Numéro pris sur une branche : le vérifier contre `main` au moment de fusionner.*

  **Le constat, chiffré** : l'écran empilait poids, série, cartes de sécurité, cibles,
  TDEE, **11 lignes de menu**, **6 interrupteurs système**, **5 lignes de bas de page**,
  déconnexion et suppression de compte. « Couleur d'accent » était à trois doigts de
  « Supprimer mon compte ». 1 848 → **1 718 lignes**.

  **La coupe** — reste : toi (Informations · Sport · Objectif · Objectif daté) et ton
  plan (macros · préférences · repas · banque · hors plan · régénérer), plus le suivi.
  Part derrière la roue (`components/ReglagesSheet.tsx`) : **Notifications · Affichage ·
  Aide et retours · Confidentialité · Compte**, plus les deux mentions légales — §6
  impose le disclaimer « aux paramètres », et cette feuille EST les paramètres.
  ℹ️ **Kyroz+ reste sur le Profil** : c'est lui qui débloque l'objectif daté et la banque,
  tous deux juste au-dessus. Derrière une roue, il devient invisible le jour où il doit
  se vendre.

  **Le canal de retour** (`app/avis.tsx`, `lib/feedback.ts`) : « Aide & contact »
  AFFICHAIT une adresse à recopier — personne n'écrit un retour à ce prix-là depuis un
  téléphone. Trois entrées, un champ, un `mailto:` pré-rempli. **Zéro backend**, donc
  zéro table, zéro migration, zéro ligne de politique de confidentialité — une table
  Supabase aurait coûté les six surfaces de `CLAUDE.md` §3, dont **deux relues par
  Apple**, à deux jours de la soumission. Ce qui est joint (version + plateforme) est
  AFFICHÉ mot pour mot au-dessus du bouton, **depuis la même fonction que ce qui part** :
  deux listes divergeraient, et la première à mentir serait celle qu'on montre.
  ⚠️ Le test qui compte le plus est celui du `&` : « macros & calories » aurait terminé
  le paramètre `body` et tronqué le message **à l'endroit exact du caractère**, sans que
  ni l'utilisateur ni nous puissions le savoir.

  🔴 **LES TROIS PIÈGES ONT ÉTÉ FERMÉS AVANT (PR #66), ET LE PREMIER A SERVI LE JOUR
  MÊME.** `profil-donnees` visait le bloc de bas de page, parti dans la feuille : une
  étape dont la cible n'est pas MONTÉE est écartée en silence, le tour se serait joué à
  5 bulles en ayant l'air complet. Elle pointe désormais la **roue**, et son texte dit ce
  qu'il y a derrière — une bulle qui désigne un bouton doit nommer ce qu'il ouvre.
  ➡️ **Un quatrième piège est apparu à l'écriture** : une ROUTE poussée depuis une modale
  ouverte naît **SOUS** elle. `/avis` et `/legal` passent donc par `versRoute`, qui ferme
  la feuille avant de pousser. Même famille que l'empilement — ce qui décide est l'ordre
  de montage, jamais l'intention du code. Vérifié à l'écran.

  ⚠️ **Et la vraie leçon du lot est une erreur de MÉTHODE, pas de code.** Ce chantier a
  été écrit, testé et déclaré vert sur une base **périmée de quatre PR** : après un
  `gh pr merge --delete-branch` refusé (la branche vivait dans un worktree), l'arbre était
  reparti sur `claude/prep-next-week` à `0ebd6ec`. Le `npm test` rendait **1 323 / 78** et
  paraissait sain — il l'était, pour un arbre sans la passe émoji, sans le montage
  paresseux de l'`ActionSheet` et **sans le garde-fou de tours qui devait justement
  valider ce chantier**. Rebasé sur `main` réel : **1 329 / 79**.
  ➡️ **Après toute commande git qui ÉCHOUE partiellement, re-mesurer où l'on est**
  (`git branch --show-current` + `git merge-base --is-ancestor origin/main HEAD`) avant
  d'écrire une ligne. Un arbre sur la mauvaise base compile, passe les tests et rend un
  écran parfaitement plausible — c'est le piège du worktree (§11), par une autre porte.

- ~~**E24 · La notification quotidienne servait un texte de plusieurs mois — le
  ré-armement ne vivait que dans l'onglet Profil**~~ ✅ **LIVRÉ le 2026-08-09**
  (signalé par le fondateur : *« la notification que j'ai reçue ce midi n'était pas
  celle qu'on avait changée dans une dernière session »*).

  **Elle ne l'était pas, et rien dans `lib/reminder.ts` n'était en cause.** Les textes
  réécrits le 2026-08-07 (heure libre + citations, `caa37e4`) sont bien sur `main`, bien
  partis en OTA le 2026-08-08 (`9bac59a9`, branche `production`), bien installés sur
  l'appareil. Ils n'ont simplement **jamais été programmés**.

  🔴 **Le mécanisme.** Le contenu d'un déclencheur `DAILY` est figé à la
  **programmation** : le système ne rappelle jamais l'app pour lui demander quoi écrire
  (c'était déjà écrit dans `notifications.ts`, et assumé). Le seul chemin qui fasse
  tourner le message — et donc le seul qui fasse arriver un texte NEUF jusqu'à l'écran
  de verrouillage — est le ré-armement. Or il ne vivait que dans l'effet de montage de
  `useReminder`, hook monté par **le seul onglet Profil**. Qui ouvre l'app sur le Plan
  et n'entre pas dans ses réglages recevait donc, tous les jours, le message programmé
  la dernière fois qu'il y était entré. Sans limite de durée.

  ⚠️ **Le commentaire du fichier affirmait le contraire** — « la rotation tient à ce que
  `useReminder` ré-arme à chaque démarrage ». Un seul `grep` sur les appelants le
  démentait. C'est le défaut de §11 « un réglage lu par un autre écran ne se relit pas,
  il se DIFFUSE », **avec un cran de plus** : ici ce n'est pas une VALEUR qui manquait à
  l'écran, c'est un EFFET DE BORD accroché à la vie d'un composant. Le patron s'applique
  pareil, la conséquence est pire — une valeur non diffusée se voit à l'écran, un
  ré-armement qui n'a pas lieu ne se voit **nulle part**.

  ✅ **Le rappel de PESÉE n'a jamais eu le défaut**, et c'est ce contraste qui a confirmé
  le diagnostic : `applyWeighInReminder` est appelé depuis `useWeightLog`, monté par
  l'écran **Plan** — donc à chaque démarrage.

  **Correctif** : `lib/notifications.ts::rearmReminder` (nouveau) + l'état du rappel
  passe en store externe (`hooks/useReminder.ts`, patron §11) chargé **une fois dans le
  layout racine**, à côté du thème, de l'accent, de l'hydratation et du prénom — cinq
  valeurs d'appareil, un seul endroit. ⚠️ `rearmReminder` **ne demande jamais la
  permission** (même règle que la pesée) : un ré-armement se produit à chaque
  lancement, y brancher `requestPermissions` ferait surgir un prompt système sans le
  moindre geste.

  Tests : +3 dans `reminder.test.ts`, **vérifiés par 3 mutations** (retirer
  `loadReminder()` du layout · repasser le démarrage par `applyReminder` · redemander la
  permission au ré-armement — chacune rougit son test et lui seul). ⚠️ Ils tiennent la
  **MÉCANIQUE**, pas le texte : aucun test ne peut dire qu'une notification est arrivée.

  ⚠️ **Vérifié à l'écran en preview** (worktree, port 8097) pour ce que le web sait
  montrer : préférence `12:00` en stockage → le Profil affiche « 12 h 00 », puce
  « Midi », « Chaque jour à 12h00 » **sans que le hook lise le disque** ; clic « Matin »
  → 8h00 et `@kyroz:reminder` = `08:00` ; rechargement → 8h00 conservé. **La
  programmation système, elle, N'EST PAS vérifiable sur le web** (`remindersSupported`
  est faux) — elle ne le sera qu'au simulateur ou sur l'appareil.

  🔴 **CE CORRECTIF EST NATIF-ONLY : fusionner ne le livre PAS.** L'arrivée sur `main`
  déploie le site (§11) ; l'app du téléphone se met à jour par
  `npx eas-cli update --branch production`. Et il faudra **deux lancements** pour le
  voir : `fallbackToCacheTimeout: 0` fait démarrer l'app sur le bundle en cache et
  applique la mise à jour au lancement SUIVANT (§2). Contournement immédiat sans rien
  publier : ouvrir l'onglet Profil une fois.

- ~~**E21 · On ne pouvait rien RETIRER de la liste de courses — et « terminer » gardait
  les non-cochés d'office**~~ ✅ **LIVRÉ le 2026-08-08** (demande du fondateur).

  Deux demandes, un seul piège : **la liste de courses est DÉRIVÉE** (plan moins
  garde-manger, recalculée), donc « supprimer » n'y est pas un retrait de tableau.

  🔴 **POURQUOI UNE CLÉ À PART (`lib/shoppingRemoved.ts`, `@kyroz:shopping:ecartes`).**
  `plan.tsx` efface `@kyroz:shopping` à **CHAQUE `persistPlan`** — dès qu'un repas est
  marqué cuisiné, qu'un écart est déclaré, qu'une recette change. Une suppression rangée
  dans ce cache aurait donc été effacée quelques minutes après le geste, et l'article
  serait revenu **sans qu'aucune action de l'utilisateur ne l'explique**. Le pire des
  défauts : ça a l'air de marcher, puis ça se défait tout seul. ➡️ **Avant de persister
  quoi que ce soit, chercher QUI EFFACE la clé qu'on allait employer.**

  **Le geste : appui long**, pas un balayage. Un glissement passe par le système de
  responder et ne se vérifie qu'au simulateur (CLAUDE.md §5) ; l'appui long n'est qu'un
  délai posé sur le press. Il n'est pas découvrable pour autant → annoncé sous les
  contrôles ET dans la bulle de visite guidée de l'article (fusionnée avec l'aller-retour
  du cochage : même ligne, même question, et deux bulles sur une même cible ne se
  départageraient pas).

  **Fin de courses** : le `confirm` devient un `choose` à deux issues — garder les
  non-cochés, ou les retirer. Avant, l'écran annonçait « ils resteront dans ta liste » et
  les gardait d'office ; les deux issues sont légitimes et l'utilisateur seul sait
  laquelle est la sienne.
  ⚠️ **« Les retirer » ne peut PAS se contenter de les effacer** : terminer vide le cache,
  donc la liste se refait depuis le plan et les non-cochés REVIENNENT. Il faut les
  écarter, sinon le choix ne pilote rien (défaut « un réglage qui ne pilote rien », A23).
  Règle sortie en fonction pure (`ecartesApresCloture`) parce qu'elle est contre-intuitive.

  **Trois détails qui ont leur raison** : un article COCHÉ qu'on retire est d'abord
  DÉCOCHÉ (il est déjà parti au frigo) · les compteurs, « Tout cocher », « Réinitialiser »
  et l'historique portent tous sur les VISIBLES (sans ce filtre, « Tout cocher » enverrait
  au frigo ce que l'utilisateur vient de retirer, et la barre n'atteindrait jamais 100 %) ·
  **quatrième état d'écran vide, « Liste vidée »**, avec un bouton Rétablir — les confondre
  ferait dire « ton frigo couvre déjà tout le plan » à qui vient de vider sa liste, et
  l'état vide n'étant pas défilant, « tirer pour rafraîchir » n'y existe pas : c'était un
  cul-de-sac.

  L'écart est **volontairement éphémère** (il vaut pour la sortie en cours) et se NETTOIE
  à chaque chargement : un nom que la liste ne propose plus sort des exclusions, sinon la
  clé grossirait sans fin et ré-écarterait en silence l'article qu'une nouvelle recette
  ramène des semaines plus tard. Un « je n'en veux plus jamais » se dit dans les
  préférences alimentaires, qui agissent sur le MOTEUR.

  Garde-fou : `lib/__tests__/shoppingRemoved.test.ts` (19 tests, **6 mutations**).
  **1 300 tests verts / 76 fichiers**, `tsc` propre.

  ✅ **VÉRIFIÉ À L'ÉCRAN le 2026-08-08 — par le FONDATEUR, sur le déploiement** :
  « l'appui long fonctionne ». Le seul maillon qui manquait est donc tenu.
  ⚠️ **Ce qui l'a empêché en session, et qui se reproduira** : `preview_start` ne lit que
  le `launch.json` du dépôt PRINCIPAL et y résout son `cwd`, donc il sert le code du
  principal — pas celui du worktree — et l'isolation interdit d'écrire dans cette copie
  de travail (celle d'une autre session). ➡️ Deux contournements, dans cet ordre : **le
  site DÉPLOYÉ une fois la PR mergée** (le plus simple, et c'est ce qui a tranché ici),
  ou le lancement à la main depuis le worktree —
  `EXPO_ROUTER_APP_ROOT=$PWD/app npx expo start --web`. Détail en CLAUDE.md §11.
  ➡️ **Et c'est la valeur d'avoir ÉCRIT le manque** : la ligne « non vérifié » a survécu
  à la session qui ne pouvait pas vérifier, jusqu'à ce que quelqu'un le puisse. Une
  vérification supposée, elle, ne se serait jamais fait rattraper.
  ⚠️ Numéro **E21** pris en vérifiant `main` ET les branches distantes — mais
  `docs/e17-emojis-restants` n'est PAS poussée, donc ce qu'elle réserve reste invisible.
  Elle amende l'entrée E17 existante, pas un nouveau numéro : risque accepté, pas ignoré.

- ~~**E20 · Le tutoriel ne couvrait qu'un onglet sur cinq — et trois de ses cinq bulles
  MENTAIENT**~~ ✅ **LIVRÉ le 2026-08-08** (PR #44, `7792ce1`), déployé et vérifié sur le
  bundle réellement servi.
  ⚠️ *Numérotée **E19** à l'écriture, renommée **E20** à la fusion : un autre chantier
  avait pris le même numéro le même jour, dans une autre session. Deux entrées de la liste
  unique portant le même identifiant, ce sont deux chantiers dont l'un devient
  introuvable — le numéro se prend au moment de FUSIONNER, pas au moment d'écrire.*
  **Le point de départ n'était pas le manque, c'était le faux.** Demandé : « un tuto plus
  poussé ». Un audit des 5 bulles existantes en a trouvé **3 fausses ou imprécises**, et
  chacune avait été vraie le jour de son écriture :
  - « Kyroz recale **automatiquement** les repas restants » — `logOffPlan` enregistre sans
    toucher au plan puis **DEMANDE** (`setAdaptPrompt`), et « Non, je garde mon plan » ne
    recale rien. La promesse « sans casser ton objectif » était en plus démentie par
    l'écran lui-même quand aucune option ne rentre dans la cible.
  - « la **barre** se remplit » — `MacroBar` est un ruban de PROPORTIONS toujours plein ;
    ce qui se remplit est le chiffre héros. La bulle envoyait l'œil au mauvais endroit.
  - « le bouton **Échanger** ce repas » + « ses **badges** d'adaptation » — le libellé réel
    est « Remplacer », et ces badges n'existent pas comme tels.
  ➡️ Corrigées AVANT d'en ajouter. Empiler des bulles sur un mensonge n'est pas un tuto.

  **Livré : 21 bulles sur 5 tours** — plan 6 · profil 6 · recettes 3 · courses 3 · frigo 3 —
  chacune déclenchée **à la 1re visite de SON onglet**. C'est ce découpage qui rend un
  tutoriel étoffé tenable : servies d'un bloc ce seraient **21 interruptions modales** dans
  la première session (chaque bulle est une `Modal` dont les panneaux avalent les taps).
  Le contenu ne décrit que ce qui ne se devine pas — la série qui avance à la simple
  ouverture et pardonne un jour manqué, le 👎 qui écarte un plat de TOUS les plans suivants,
  le frigo qui se vide au « J'ai cuisiné », ce qui suit le compte vs ce qui reste local.

  **Le contenu sort des écrans** → `lib/tours.ts`, sans aucun import, donc testable (même
  procédé que `collapsingTitle.ts` / `accentColor.ts`). **Chaque étape porte en commentaire
  le chemin de code qui la PROUVE.**

  **Trois manques du moteur, réparés** : bouton **« Précédent »** (une bulle lue trop vite
  était perdue, il fallait relancer le tour entier) · **« ? » de rejeu sur les CINQ
  en-têtes** (`TourButton` — il n'existait que sur Plan, donc « Passer » ailleurs perdait le
  tour **à vie**) · **« Revoir les tutos »** dans le Profil (`resetAllTours`).
  Ancrages : `MacroBar`, `MenuRow`, `WeightSummaryCard` et la rangée d'icônes de `MealCard`
  n'acceptaient aucune ref → prop `tourId` optionnelle, sur le patron déjà en place
  (`cookTourId`). Les 3 icônes de `MealCard` sont groupées dans leur propre `View` : le
  rendu ne bouge pas d'un pixel, mais le spotlight n'engloutit plus le bouton cuisiné.
  `startTour` **avertit en dev quand un tour est AMPUTÉ** — le filtre des cibles non montées
  faisait disparaître une étape en silence, tour plus court d'apparence complète.

  **Garde-fou : `lib/__tests__/visiteGuidee.test.ts`** (12 tests, **5 mutations**). Il
  vérifie surtout qu'aucune étape ne vise une **cible absente du code** : c'est le chemin
  par lequel la dérive arrive vraiment. Plus : tours non vides, ids uniques, bornes de
  rédaction, aucun émoji, aucun ton de reproche, table `TOURS` ↔ écrans **dans les deux
  sens**. ⚠️ Le repli `?? []` vient d'une mutation : sans lui, un tour inconnu cassait
  l'**import** et vitest affichait « no tests » — ce qui se lit comme « rien à vérifier »,
  pas comme un échec.

  🔴 **TROUVÉ EN CHEMIN — une phrase de l'écran Plan était FAUSSE.** « Jour de repos · un
  peu moins de calories et de glucides » n'était conditionnée qu'à `isRestDay`, jamais à
  l'existence d'un écart. Mesuré sur le moteur (H 30 ans, 83 kg, 18 % MG, sèche, NEAT desk) :
  **sans sport, 2042 kcal les sept jours, amplitude 0** ; avec 3 séances de 60 min,
  2042/2303 alternés, amplitude 261. ➡️ C'est la **CAPTURE des deux textes côte à côte** qui
  l'a montré — la bulle, elle, se conditionnait déjà (`moduleParVolume`). Corrigé, cf.
  CLAUDE.md §6 et §8.

  ⚠️ **Deux pièges de VÉRIFICATION, tous deux hors du code** (ils valent pour la suite) :
  1. **Le run de déploiement portant le SHA a été ANNULÉ, et ce n'était pas un échec.**
     Trois merges en 60 s (#45, #44, #42) : le verrou `concurrency: pages` n'autorise
     **qu'un seul run en attente**, le plus récent évince le précédent. ➡️ La question utile
     n'est pas « mon run est-il vert » mais **« mon commit est-il un ancêtre du SHA qui
     déploie »** (`git merge-base --is-ancestor`). Republier pour « réveiller » le
     déploiement empilerait des runs qui s'annulent entre eux.
  2. **Le bundle WEB échappe les non-ASCII en `\xNN`**, pas `\uXXXX`. Chercher une phrase
     accentuée dans le bundle servi rend **0 à tort** : le minifieur écrit
     `title:'Ta s\xe9rie, sans pression'`. ⚠️ Ce n'est PAS le piège `strings`/Hermes déjà
     consigné (là-bas la chaîne est ABSENTE de la sortie ; ici elle est PRÉSENTE et
     ré-encodée) — même symptôme, causes et remèdes différents. ➡️ Ce qui tranche :
     chercher les **FRAGMENTS**. « sans pression » → 1, « Elle avance d » → 1, la phrase
     entière → 0. Des morceaux qui sortent sans l'ensemble = présente et ré-encodée, jamais
     absente, et le point de coupure désigne le caractère fautif. Puis **lire les octets
     réels** au lieu de deviner l'encodage. Et passer par **node, pas par le shell** (bash
     mangeait les `\\u` avant `grep`, ajoutant une 2ᵉ fausse piste à la 1re).
  ➡️ Contrôle final sur le bundle en ligne : **13/13 conformes** — les 21 bulles présentes
  (accentuées comprises), les 4 anciens textes faux à **0**, et un témoin négatif
  discriminant (« Ta série, SOUS pression » → 0 quand « sans pression » → 1).

  📌 **Ce que l'audit a levé et qui N'A PAS été traité** (hors périmètre « tuto » — c'est du
  code manquant, pas de la pédagogie) :
  - ✅ **SANS OBJET depuis le 2026-08-18** : la **banque de calories** a été éteinte
    (`lib/featureFlags.ts::RYTHME_HEBDOMADAIRE_ACTIF = false`), donc il n'y a plus de
    ligne « samedi +600 » à faire apparaître sur le Plan. `uncompensatedKcal`, lui, avait
    déjà été affiché entre-temps (`profil.tsx`, sous l'éditeur, avant son extinction) —
    le point était donc traité avant de devenir sans objet ;
  - un **repas fixe disparaît de la liste de courses** (`shoppingList.ts` : `if (meal.fixed)
    continue`) et aucun écran ne le mentionne ;
  - le **plan ne se renouvelle jamais** tout seul : `dayMeta` re-date la rangée sur la
    semaine en cours, donc les mêmes recettes reviennent avec les dates d'aujourd'hui
    jusqu'à un changement de réglage ou un « Régénérer ».

- **E19 · Le brief « fortes masses grasses » accusait les gros gabarits — le plancher
  mord les MAIGRES** 📏 **MESURÉ le 2026-08-07, aucune ligne de moteur touchée.**
  Contrôle : `npm run mesure:adiposite`.

  Le brief du 07/08 suspectait quatre étages chez un H de 150 kg à 45 %MG, avec un
  symptôme : « le plancher EA passe au-dessus de la cible, l'app rend un plan de
  MAINTIEN à quelqu'un venu pour perdre ». Il prévenait lui-même qu'il était rédigé
  contre une DESCRIPTION du moteur et pas contre le code, et imposait une étape 0
  bloquante. Elle l'a invalidé — **ses quatre prémisses sont fausses** :

  | ce que le brief suppose | ce que le code fait |
  |---|---|
  | Katch dès que le %MG est saisi | Katch **seulement** si `body_fat_source === 'measured'`, question posée au-delà de 35/43 % |
  | NEAT sédentaire 1,20 | **1,30** |
  | plancher EA = `30 × FFM + sport` | `min(30 × FFM + sport, **TDEE**)` — plafonné à la maintenance |
  | cible plafonnée à −25 % | « Sèche » demande un delta **fixe de −300** : le cap ne mord pas sur le chemin gratuit |
  | `bindingFloor` « manque aujourd'hui » | **existe déjà** — `ClampRecord.source`, les 5 valeurs demandées |
  | protéines peut-être en g/kg de poids | poids **ajusté** (FFM + 25 % de la MG), clampé 1,6–2,6 g/kg FFM |

  **Le cas de référence va bien** : TDEE 3416, plancher EA 2772 — il ne mord pas.
  Déficit 300 kcal/j en « Sèche », **644 (18,9 %)** si un objectif daté demande le
  maximum. Protéines 215 g (2,61 g/kg FFM), pas les 270 redoutés. Plan faisable :
  écart calorique du jour **0,28 %**, 2 repas sur 140 en `protein_below_target`.

  🔴 **CE QUI EST VRAI, ET C'EST L'INVERSE DU BRIEF.** Le plancher vaut `30 × masse
  maigre` : il mord donc **d'autant plus fort que la masse maigre est GROSSE**. Sur
  56 600 corps plausibles (IMC ≥ 18,5, FFMI sous le plafond naturel), **30 reçoivent
  un déficit servi de ZÉRO** et 527 sont sous 5 % — tous entre **8 et 24 %MG,
  médiane 14**, c'est-à-dire le public déclaré de Kyroz. Exemple : `H 88 kg · 185 cm
  · 8 %MG · sédentaire · course 4×60` → TDEE 2891, **servi 2891**. `FLOOR_APPLIED` et
  `LOW_EA_WARNING` sont bien levés et le Profil nomme le plancher, donc ce n'est pas
  silencieux — mais le plan EST un maintien.
  ➡️ **Décision fondateur du 2026-08-07 : on ne touche à rien, on attend les retours
  utilisateurs.** 30 corps sur 56 600, et c'est précisément la population sur laquelle
  le garde-fou RED-S est le plus justifié. Ne pas rouvrir sans rejouer la mesure.

  ⚠️ **Un seul mécanisme du brief survit, dix fois plus petit qu'annoncé et par un
  autre canal.** La sous-déclaration au plafond du sélecteur : un H de 150 kg qui tape
  la dernière silhouette (35 %) au lieu de saisir 45 % voit son déficit tomber de 300 à
  **194 kcal/j**. Le TDEE ne bouge PAS (Mifflin ne lit pas le %MG) — c'est le
  **plancher** qui monte de 450 kcal. Coût réel **106 kcal/j**, pas les ~470 annoncés.
  Le garde-fou existe déjà : à ce gabarit, taper 35 % lève le repère `lean_mass`, qui
  invite explicitement à saisir un chiffre à la main.

  ➡️ **La leçon de méthode** : un brief qui raisonne sur une description du moteur
  invente des constantes plausibles et en déduit un coupable plausible. Ici il a
  désigné la population exactement opposée à celle qui souffre. **L'étape 0 bloquante
  était le bon réflexe** — c'est elle qui a évité de desserrer un garde-fou de sécurité
  sur les seuls corps qu'il protège vraiment, et de contredire la décision E23 du
  2026-08-06 (« réserver Katch aux fortes adiposités — ne pas corriger sans le
  fondateur »), que l'étape 1 demandait frontalement.

- ~~**E23 · Katch-McArdle prenait une DEVINETTE pour une mesure**~~ ✅ **LIVRÉ
  le 2026-08-06**, **amendé le 2026-08-07** — code, migration jouée, OTA `93fad600`,
  ⚠️ *Portait le numéro **E16**, en DOUBLON avec « le plan servait au coureur de 3 h le
  budget d'un jour de repos ». Renumérotée **E23** le 2026-08-08. C'est celle-ci qui
  bouge parce qu'elle était la MOINS référencée (2 renvois contre 5) — le critère est le
  coût de la correction, pas l'ancienneté. **Cinquième collision recensée**, et la plus
  ancienne : elle vivait sur `main` depuis le 2026-08-06 sans que personne ne la voie,
  parce que les deux entrées sont livrées (barrées) et que personne ne « cherche » un
  chantier fini. ➡️ Le contrôle qui l'aurait trouvée tient en une ligne :*
  `grep -oE '^- .{0,6}\*\*E[0-9]+ ·' AGENTS.md | grep -oE 'E[0-9]+' | sort | uniq -d`
  web déployé et **mesuré sur le bundle réellement servi** (`body_fat_source` **4**,
  « Oui, avec un appareil » **1**, « Non, c'est une estimation » **1** ; témoins :
  `body_fat_pct` 7, chaîne inexistante 0). Un run vert dit que le robot a fini, pas
  que la bonne chose est en ligne — les deux se vérifient séparément.
  `ENGINE_REV` 5 → 6.

  🔴 **AMENDEMENT DU 2026-08-07 — la question n'est posée qu'au-delà de 35 % (H) /
  43 % (F)**, le plafond du sélecteur de silhouettes. Décision du fondateur, prise
  après que le coût lui a été chiffré et maintenue après objection.
  **Sous le seuil la question n'existe pas**, donc `body_fat_source` reste `undefined`,
  donc **Mifflin pour tout le monde** — y compris qui sort d'un DEXA :

  | corps, avec une VRAIE mesure | perte |         | perte |
  |---|---|---|---|
  | H 75 kg · 12 % (DEXA) | −94 kcal/j | F 58 kg · 20 % | −81 kcal/j |
  | H 82 kg · 15 % | −99 kcal/j | F 62 kg · 25 % | −48 kcal/j |

  Katch-McArdle est pourtant le plus précis sur ces corps-là. L'arbitrage assume de le
  réserver aux fortes adiposités, où l'écart est le plus gros (**+227 kcal/j** sur un
  H de 110 kg à 38 %) et où la silhouette ment le plus.
  ➡️ **Ce n'est PAS un oubli. Ne pas le « corriger » sans le fondateur** — une session
  qui verra un DEXA à 12 % traité en Mifflin croira à un bug.
  Règles pures et testées : `safety.ts::provenanceDemandee` / `provenanceRetenue`,
  bloc 8 de `bodyFatSource.test.ts`, trois mutations (M4-M6).

  ⚠️ **L'état FANTÔME que le seuil créait, et qui n'était pas dans la demande** :
  répondre « mesuré » à 40 % puis corriger son chiffre à 20 % laissait `'measured'`
  enregistré alors que la question avait disparu de l'écran — Katch s'appliquait via un
  réglage inatteignable. `provenanceRetenue` le nettoie. `'estimated'` survit (il calcule
  comme `undefined`, ne déplace aucune cible, et « dit au jugé » est une info vraie).

  🟡 **CE NETTOYAGE EST CÔTÉ ÉCRAN, PAS CÔTÉ MOTEUR — à savoir avant d'en déduire quoi
  que ce soit.** Il ne s'applique qu'au moment où quelqu'un touche le champ. Un profil
  DÉJÀ enregistré avec `'measured'` sous le seuil garde donc Katch jusqu'à ce qu'il
  rouvre l'écran. C'est le choix conservateur (aucune cible ne bouge en silence, pas de
  bump d'`ENGINE_REV`), mais **la règle n'est pas uniformément appliquée sur le parc**.
  Portée réelle au 2026-08-07 : quasi nulle (2 testeurs, feature vieille de 14 h). La
  rendre uniforme demanderait `ENGINE_REV` 7 + avertissement one-shot — à arbitrer.

  ✅ **L'IPHONE L'A depuis le 2026-08-07** — 5ᵉ OTA `9d625d00`, commit `751dd86`,
  bundle mesuré avant ET après envoi (secrets 1/1/0 ; `provenanceDemandee`,
  `provenanceRetenue`, `body_fat_source` présents ; témoin négatif 0). Web et natif
  posent enfin la question au même moment.

  ⚠️ **UNE SECONDE IMPLÉMENTATION DU MÊME CHANTIER A EXISTÉ — JETÉE le 2026-08-07**,
  sur décision du fondateur et **après avoir vérifié idée par idée qu'il n'y avait rien
  à en reprendre**. Le worktree `body-fat-provenance-audit-23f355` portait `lib/tdee.ts`
  et `lib/types.ts` modifiés mais jamais commités, sur une base de 28 commits de retard
  (`9169c9a`) : `BodyFatSource`, `BmrBody`, `katchEligible`, `calculateBMR` prenant le
  corps entier — **la même conception, en moins avancé**, sans `safety.ts`, sans la
  colonne, sans la migration, sans l'écran, sans les 23 tests, sans le seuil 35/43.
  Ses sept arguments de fond (coût linéaire ne dépendant que du poids, erreur
  SYSTÉMATIQUE et non du bruit, parallèle avec le plancher protéique optionnel,
  126 kcal/j, 5 à 8 points…) étaient **tous déjà** dans `types.ts`, `tdee.ts`, la
  migration et `CLAUDE.md`.
  ⚠️ **Le tri a failli conclure l'inverse, deux fois, à cause de l'INSTRUMENT** : (1)
  `\|` dans un motif `rg` cherche une barre LITTÉRALE, pas une alternative ; (2) **zsh
  ne découpe pas une variable non quotée en mots** — `grep -l "$m" $FICHIERS` passait
  toute la liste comme UN nom de fichier, et rendait « absent » pour tout. Les deux
  fabriquaient des faux négatifs qui auraient justifié de « récupérer » du travail déjà
  présent. ➡️ **Un tri de ce genre se fait avec un TÉMOIN POSITIF** (une chaîne qu'on
  sait présente) : c'est lui qui a désigné la panne. Et une recherche par chaîne exacte
  ne trouve pas une IDÉE reformulée — la conclusion finale est venue de la LECTURE du
  fichier, pas du `grep`.
  ➡️ Leçon générale : **deux sessions sur le même chantier ne se rattrapent pas, elles
  divergent.** Celle-ci a coûté 20 h de travail parallèle pour zéro ligne livrée, et
  n'était visible que par `npm run check:suspens` — `git status` ne montre que son
  propre worktree.

  **Le défaut** : dès qu'un %MG était renseigné, le moteur basculait sur Katch-McArdle.
  Or ce chiffre pouvait venir de deux mondes qui n'ont rien à voir — un impédancemètre,
  ou **une tape sur une silhouette** dans `BodyFatPicker`, dont l'incertitude est de
  ±5 points. Katch est la formule la plus PRÉCISE quand la masse maigre est connue et la
  plus FRAGILE quand elle est devinée : c'est sa seule entrée, là où Mifflin en lit
  quatre certaines. **Mesuré : 1 point de %MG = ±13 kcal/j de BMR**, donc les ±5 points
  de la silhouette valaient **jusqu'à 126 kcal/j** servis à l'assiette — à tous les
  niveaux de NEAT — sans qu'aucun écran ne dise que le chiffre était une estimation.

  **Ce qui a été livré** — option **A**, choisie par le fondateur :
  - `body_fat_source: 'measured' | 'estimated'` (`lib/types.ts`), colonne
    `profiles.body_fat_source`, ajoutée à `PROFILE_COLS` **et** à
    `PROFILE_COLS_LAST_MIGRATION` ;
  - prédicat unique `tdee.ts::katchEligible`, et **`calculateBMR` prend désormais le
    CORPS entier** au lieu d'un `%MG` positionnel. Ce n'est pas cosmétique : c'est un
    garde-fou de STRUCTURE — aucun des 5 appelants ne peut plus passer le chiffre en
    oubliant sa provenance, `tsc` l'en empêche ;
  - `bodyFatTdeeImpact(body, pct, source)` rend **0** quand ce n'est pas mesuré : l'écran
    ne peut plus annoncer des kcal qui ne seront pas servis (règle « pas de mensonge ») ;
  - la question est posée **au moment de la saisie**, et **seulement sur la saisie
    manuelle** — taper une silhouette EST la réponse (`estimated`), la redemander serait
    une friction pour rien. Deux puces : « Oui, avec un appareil » / « Non, c'est une
    estimation ». Aucun jargon, le mot « Katch-McArdle » n'apparaît nulle part.

  **Ce qui NE bouge PAS, et c'est la décision** : `resolvedBodyFatPct` / `fatFreeMassKg`
  continuent de lire le %MG DÉCLARÉ quelle que soit sa provenance → plancher d'énergie
  disponible, base protéique et rythme de perte inchangés **au kcal près** (vérifié sur
  12 corps). L'option B — retomber sur Deurenberg quand c'est estimé — a été **mesurée
  et écartée** : Deurenberg ne lit que l'IMC, l'âge et le sexe, et sur les corps
  entraînés que Kyroz sert il est **pire qu'une silhouette** (+12 points sur une femme de
  65 kg à 18 %, +8 sur un homme de 72 kg à 10 %).

  **Défaut par défaut = `undefined` → calcule comme ESTIMÉ, et la colonne n'est PAS
  backfillée.** Backfiller à `'estimated'` rendrait « jamais demandé » indistinguable de
  « répondu au jugé » — la question ne pourrait plus jamais être posée à ces comptes.
  **Écart mesuré sur les 12 silhouettes du sélecteur** : TDEE **−217 à +363 kcal/j**,
  cible servie **−80 à +363** (le plancher amortit toujours les baisses), croissant avec
  le %MG déclaré. Au-delà de 100 kcal/j, l'avertissement one-shot `engine_notice` part.

  ✅ **Migration JOUÉE le 2026-08-06**, mesurée avant et après (`body_fat_source` :
  400 → 200 ; les 38 colonnes de `PROFILE_COLS` en une requête : 400 → 200). Consignée
  dans `supabase/JOURNAL-MIGRATIONS.md`. Le mode de panne qu'elle ferme est réel et
  s'est produit 3 fois : colonne absente → upsert ENTIER rejeté (PGRST204) → synchro du
  profil morte en silence. Procédure : `supabase/PROCEDURE-2026-08-06-body-fat-source.md`.
  ⚠️ **La procédure avait ses deux dernières étapes dans le mauvais ordre** : elle
  exigeait de prouver une écriture réelle AVANT le déploiement, or cette écriture passe
  par la question de provenance à l'écran, qui n'existe qu'après. Corrigée. Reste donc :
  merge → déploiement → vérifier `body_fat_source = 'measured'` en base depuis l'app.

  ⚠️ **Deux constats sortis du chantier, à ne pas perdre :**
  1. **Le sélecteur de silhouettes a un PLAFOND** — 35 % (H) / 43 % (F). Au-delà, la
     dernière silhouette **sous-estime** sans le dire. C'est le vrai défaut derrière
     l'intuition du fondateur (« au-delà de 35 %, conseiller un appareil ») : le message
     de la note `lean_mass` le dit maintenant, mais **seulement au plafond** — cette note
     couvre deux situations opposées et un texte unique en aurait menti sur l'une.
  2. **`reachableByDate` est sur une FALAISE** : mesuré, **3 kcal** de BMR d'écart
     suffisent à le faire basculer et à déplacer la date projetée de **94 jours**
     (`datedGoal.test.ts`, cas A3). Pré-existant, sans rapport avec ce chantier, mais
     documenté dans le test plutôt que laissé comme un chiffre à rafistoler.

  `lib/types.ts` · `lib/tdee.ts` · `lib/safety.ts` · `lib/sync.ts` ·
  `components/BodyFatPicker.tsx` · `app/(auth)/onboarding.tsx` · `app/(tabs)/profil.tsx` ·
  `supabase/schema.sql` + migration · garde-fou `lib/__tests__/bodyFatSource.test.ts`.

- ~~**E12 · Le glissement pour fermer une feuille était MORT en natif — depuis le
  commit initial**~~ ✅ **CORRIGÉ le 2026-08-05, mesuré au simulateur iOS.**
  Signalé par le fondateur sur le build TestFlight (« le drag vers le bas ne
  fonctionne sur aucun écran »). Reproduit : tirer la poignée ne déplaçait la feuille
  d'**aucun pixel**, alors que le contenu défilait et que les boutons répondaient.
  **Cause** : `onStartShouldSetPanResponder` renvoyait `false` — posé volontairement
  « pour laisser passer les taps ». En natif, si aucune vue ne réclame le responder
  **au contact**, les phases « mouvement » ne sont plus proposées du tout : ni
  `onMoveShouldSetPanResponder`, ni `onMoveShouldSetPanResponderCapture` (les deux
  essayés, mesurés sans effet). Le geste n'a donc **jamais** fonctionné au doigt.
  ⚠️ **Pourquoi ça a tenu des mois** : `react-native-web` fait passer le glissement par
  des événements SOURIS que le système de responder voit toujours. Le web disait
  « ça marche » et ne pouvait rien dire d'autre. ➡️ **Pour un GESTE, le web n'est pas
  une mesure** — il faut le simulateur.
  ⚠️ **Second défaut, révélé par le premier correctif** (on ne pouvait pas l'atteindre
  tant que le geste ne partait jamais) : en tirant depuis l'en-tête de la recette — qui
  vit, lui, DANS le `ScrollView` — le scroll natif reprend le geste en cours de route,
  le pan est « terminé » sans passer par `onPanResponderRelease`, et la feuille restait
  **figée à mi-course**. D'où `onPanResponderTerminationRequest: () => false` +
  `onPanResponderTerminate`.
  ⚠️ **Piège de méthode, qui a failli produire un faux diagnostic** : un `PanResponder`
  vit dans un `useRef`. **Fast Refresh ne le recrée pas** — modifier ses callbacks et
  recharger à chaud ne change rien, alors qu'un changement de STYLE s'applique (fausse
  preuve que « le rechargement marche »). ➡️ Après toute modif d'un PanResponder :
  `xcrun simctl terminate booted app.kyroz.mobile` puis `launch`.
  Vérifié à l'écran, avant/après : poignée ✅ ferme · en-tête ✅ ferme sans blocage ·
  défilement ✅ intact · bouton cœur ✅ intact (feuille reste ouverte) · `ActionSheet`
  ✅ ferme · saisie + suggestions Ciqual ✅ intactes.
  `components/Sheet.tsx`, `components/ActionSheet.tsx`.
  ✅ **PUBLIÉ EN OTA le 2026-08-06** — la **première** du projet (la branche `production`
  était vide jusque-là). Group `28dce9c7-0270-4c3f-b0b9-88b1a224ce8c`, runtime `1.0.0`,
  commit `31ee5724` — donc atteint le build TestFlight **3**, sans repasser par Apple.
  ⚠️ `--environment production` est **obligatoire** depuis le SDK 55 : sans lui, les
  variables serveur EAS ne sont pas chargées et le bundle part **sans URL Supabase**
  (l'app ne démarre alors plus, pour tout le monde, en quelques minutes).
  ✅ **Bundle vérifié avant de considérer l'affaire close**, méthode CLAUDE.md §2
  (`strings -a` sur le `.hbc`) : URL Supabase **1**, `sb_publishable_` **1**,
  `sk-ant-` **0**.

- ~~**E18 · Une feuille impossible à fermer — ni au glissement, ni au fond**~~
  ✅ **CORRIGÉ le 2026-08-06.** Signalé par le fondateur sur l'édition d'une quantité
  du frigo, **vu une seule fois** : « impossible de fermer la feuille, ni drag etc.,
  maintenant ça remarche ». Un défaut intermittent — donc une COURSE.
  **Le mécanisme, et il n'est pas dans le frigo** : `render` garde la feuille montée
  le temps de l'animation de sortie, et sa remise à zéro était conditionnée à
  `finished` — c'est-à-dire à une animation qui va jusqu'au bout. Or elle s'interrompt
  dès qu'un second geste touche `ty` pendant la sortie (le pan fait `setValue`, puis
  son ressort de retour). `finished` vaut alors `false`, et **`render` reste `true`
  pour toujours** : l'effet ne dépend que de `visible`, déjà `false`, il ne se
  redéclenchera jamais. Le ressort ramène la feuille à 0 — donc **pleinement
  visible** — et `onClose` ne peut plus rien : il remet à `null` un état déjà `null`,
  React ne re-rend pas. Seule une sortie d'écran la déloge.
  ➡️ **Le correctif ne cherche pas à gagner la course, il retire la condition** : on
  démonte dès que l'animation s'arrête, quelle qu'en soit la raison, sauf réouverture
  entre-temps (`visibleRef`, lu au rappel et non capturé). Et le geste est éteint
  pendant la sortie, ce qui tarit la source de l'interruption — les deux correctifs
  se valident seuls.
  ⚠️ **Le défaut vivait dans les DEUX feuilles** (`Sheet` ET `ActionSheet`), donc sur
  toutes les feuilles de l'app, pas seulement le frigo. Il est dans `main` depuis
  toujours et il est parti dans les trois OTA.
  ⚠️ **Diagnostic par LECTURE, pas par reproduction** — et c'est assumé : une course
  qui se voit une fois en des semaines ne se convoque pas. Ce qui rend le correctif
  sûr sans reproduction, c'est qu'il **supprime la dépendance à un événement qui peut
  ne pas arriver** au lieu de la contourner.
  Garde-fou : **`lib/__tests__/feuilles.test.ts`** — il compte les DEUX pannes de cette
  famille (E12 le geste tué au contact, E18 le démontage conditionné), **vérifiées par
  mutation : réintroduire l'une ou l'autre fait rougir**. C'était la pièce manquante :
  la règle E12 était écrite dans CLAUDE.md §5 depuis le 5 août mais **rien ne la
  comptait** — une règle écrite reste décorative tant qu'aucun test ne la mesure.

- ~~**E17 · Une case laissée vide voulait dire « je m'entraîne 7 jours sur 7 »**~~
  ✅ **CORRIGÉ le 2026-08-06**, dans la foulée d'E16 — et c'est le fondateur qui l'a
  flairé, en demandant « quels jours ? ».
  🔴 **E16 était INERTE pour tout nouvel inscrit.** L'onboarding démarrait à zéro jour
  de repos coché et enregistrait ce vide tel quel : `rest_weekdays = []`. Or `[]` est
  une réponse, pas une absence — le moteur comptait 7 jours d'entraînement, relissait
  la dépense sur la semaine, et **le plan repartait PLAT**. Mesuré :
  `rien coché → 1683 partout`, contre `sam+dim cochés → 1778 × 5 et 1445 × 2`.
  ➡️ **Ironie complète : le profil LEGACY, qui n'a jamais vu la question, était MIEUX
  servi** (1445 / 1861 répartis) que le nouvel inscrit qui l'a vue et ne l'a pas remplie.
  ⚠️ **Et le Profil, lui, pré-cochait déjà la déduction** (`effectiveRestWeekdays`).
  Deux écrans, deux comportements pour le même réglage — même motif que les cinq
  onglets qui ne repliaient pas leur titre pareil.
  **Ce qui a été écarté, et pourquoi** : « obliger à cocher au moins un jour » — proposé
  en premier, refusé sur deux motifs. (1) « Aucun jour de repos » est une réponse
  LÉGITIME : forcer ≥ 1 ferait mentir qui s'entraîne tous les jours, et son plan
  deviendrait faux dans l'autre sens. (2) On bloquerait l'onboarding pour une info que
  le moteur sait déjà déduire.
  **Ce qui a été fait** : la déduction est **pré-cochée** à l'onboarding comme elle
  l'était au Profil (`deducedRestWeekdays`, désormais SOURCE UNIQUE dans `planEngine`),
  et une puce **« Aucun »** — idée du fondateur — rend le choix « je n'en ai pas »
  explicite. La donnée supportait déjà les trois états (`undefined` = pas répondu,
  `[]` = aucun, liste = choisi) ; **seule l'UI les confondait**.
  ➡️ **La pré-sélection ne devine pas mieux : elle rend l'hypothèse VISIBLE, donc
  corrigeable.** On ne rectifie pas ce qu'on ne nous montre pas — c'est tout l'écart
  entre une déduction silencieuse et un défaut affiché.
  ⚠️ **Le réglage a changé de NATURE et il faut le savoir** : avant, se tromper de jour
  ne déplaçait que des glucides ; depuis E16, ça déplace **jusqu'à 330 kcal**.
  ⚠️ **Deux textes promettaient du faux**, corrigés au passage : « (mêmes calories) »
  — plus vrai depuis E16 — et « privilégie les recettes *récup* », plus vrai depuis le
  **2026-08-03**, date à laquelle `rest_day_ok` a été supprimé et la sélection a cessé
  de le lire. Une promesse d'écran survit à la fonctionnalité qu'elle décrit.
  Garde-fous : 3 cas de plus dans `volumeConcentre.test.ts` (accepter la pré-sélection
  rend EXACTEMENT la déduction du moteur — vérifié par mutation ; « Aucun » reste
  possible et rend le plan plat ; la déduction ne propose jamais un jour hors plan).
  1068 tests verts.
  ⚠️ **Non vérifié à l'écran** : l'étape 7 de l'onboarding n'a pas pu être atteinte —
  le panneau navigateur ne répond plus aux clics réels et les clics synthétiques
  RN Web n'avancent pas ce formulaire. Le composant MONTE bien (l'onboarding rend ses
  écrans, l'effet de pré-sélection est inconditionnel et a donc tourné) et le Profil,
  qui partage le sélecteur, rend correctement. **À regarder au simulateur.**

- ~~**E16 · Le plan servait au coureur de 3 h le budget d'un jour de repos**~~
  ✅ **CORRIGÉ le 2026-08-06** (`lib/dailyBudget.ts`, `ENGINE_VERSION` 45 → 46).
  Chantier reporté par le fondateur le 2026-07-29, ressorti sur sa demande.
  **Le défaut** : deux lissages superposés — `exerciseKcalPerDay` étalait la dépense
  sur 7 jours, et le plan était isocalorique. Trois sorties de 45 min et une sortie de
  3 h étaient donc indiscernables. Mesuré (F 60 kg, 25 %MG, sèche) : énergie
  disponible **annoncée** 32,1 quel que soit le volume, **vécue** le jour de la séance
  26,8 (3×45) · 18,9 (2×90) · 11,0 (1×120) · **0,4** (1×180). L'app conseillait
  1683 kcal le jour d'un trois heures. Après : **l'EA vécue égale l'EA annoncée, tous
  les jours**, et la semaine garde son total au kcal près (déficit et trajectoire
  datée inchangés).
  ➡️ **La question qui bloquait le chantier a été RETIRÉE, pas répondue.** La fiche
  disait : « trancher d'abord si Kyroz s'adresse à quelqu'un qui fait des sorties de
  3 h — ça décide de tout ». Le mécanisme retenu est proportionnel, donc il s'auto-
  dimensionne : ±7 % sur le gabarit cible (muscu 4×60), ×2,2 sur `1×180`. Une décision
  de cible n'était nécessaire que parce que la solution envisagée avait un seuil.
  ⚠️ **Ce qui avait fait rejeter P2.1 était un mauvais plancher, pas une impossibilité.**
  « Le ratio des planchers seuls vaut déjà 2,30 » appliquait JOUR PAR JOUR le plancher
  d'énergie disponible — qui ne l'est pas. Le bon raisonnement était déjà écrit, pour
  la banque de calories (`tdee.ts::bankFloorKcal`) : un mécanisme qui conserve le total
  de la semaine laisse l'exposition hebdomadaire inchangée, donc le plancher quotidien
  est `max(BMR, filet absolu)`. Le plafond arbitraire rejeté (`MAX_DAY_RATIO = 1,35`)
  ne revient pas : le rapport entre les jours est celui des dépenses réelles.
  🔴 **Le correctif a fait DISPARAÎTRE un garde-fou de §6, en silence.** `fatTargetG`
  relève les lipides au seuil de carence une fois, sur la cible PLATE ; le plan dérive
  les grammes d'un RATIO. Tant que les jours se valaient, les deux coïncidaient. Dès
  qu'un jour est descendu : **4,2 % des jours de repos sous 0,8 g/kg** (0 % avant),
  pire cas 64 g pour 70. `dayRatioWithFatFloor` le rétablit sur **les deux** chemins
  (génération ET recalage — l'oubli exact commis avec le plancher protéique), borné à
  `target_fat_g` parce qu'un plancher ne relève jamais la cible. → **0,3 %**.
  ⚠️ **Deux constantes ont dû être re-mesurées : leur PRÉMISSE avait changé.** Toutes
  deux calibrées quand les jours étaient identiques.
  · `REST_DAY_CARB_TO_FAT_SHIFT` **0,12 → 0,08**, critère « les glucides absorbent la
  variation, les lipides gardent leur plancher » — à 0,12 les lipides MONTAIENT (+2/+6 g)
  sur un jour à −330 kcal ; à 0 la baisse sortait pour moitié des lipides.
  ⚠️ **0,07 notait mieux que 0,08 et n'a PAS été retenu** : 0,06 casse (un
  petit-déjeuner vegan servi 7 jours sur 7), donc 0,07 est collé à la falaise. On ne
  choisit pas la valeur voisine d'un échec pour deux semaines sur 480.
  · `FAMILY_SELECT_W_CANON` **0,03 → 0,04** : il protégeait un « zéro repas hors cible »
  au canonique, qui n'est plus atteignable à AUCUN poids. Il ne protégeait plus rien.
  **Ce que ça coûte, mesuré** (480 semaines) : quasi-doublons 9,0 → 9,6 %, précision
  du jour 0,34 → 0,39 %, recettes distinctes min 49 → 53. Mais le plan **canonique**
  passe de 11,7 à 16,7 % et gagne **6 repas hors cible** (0 avant) — les six sur **un
  seul profil**, F 55 kg sèche vegan / vegan+SG, tous les JOURS DE REPOS (1328 kcal),
  où le catalogue n'a ni dîner ni collation assez petits. Dégradation **nulle en
  omnivore** (1 semaine avant, 1 après), entière dans les régimes végétaux.
  ➡️ **Levier restant : une vague de catalogue en petits formats vegan / vegan+SG.**
  ⚠️ **Trois contrôles mesuraient contre la cible PLATE et accusaient donc le moteur
  du changement qu'on venait de lui faire** : `mesure-variete` annonçait 6,94 % d'écart
  calorique au lieu de 0,41 % (20× de perte de précision imaginaire), et 14 tests
  échouaient sans qu'un seul défaut existe. Corrigés vers `dayTargetKcal`, avec les
  MÊMES tolérances — donc l'invariant tient réellement, par jour.
  🔴 **Et un bug que ni `tsc` ni 1065 tests ne pouvaient voir** : le `useMemo` ajouté à
  `FirstPlanReveal` était posé APRÈS son `return null` → « Rendered more hooks than
  during the previous render », écran de bienvenue dans l'ErrorBoundary. Trouvé au
  rendu, en 30 secondes. Le même oubli, latent, attendait dans `profil.tsx`.
  ⚠️ **Trois écrans mentaient après coup** et ont été corrigés : « Cibles du jour »
  affichait la moyenne comme une cible quotidienne, `FirstPlanReveal` annonçait
  « kcal / jour », et le bandeau du jour de repos disait « (mêmes kcal) » deux lignes
  au-dessus d'un nombre qui le contredisait. L'aperçu « Ta semaine après répartition »
  du Profil, lui, **recalculait les cibles en parallèle du moteur** — le doublon exact
  que `bankedTargets` existe pour empêcher ; il lit désormais `baseDayTargets`.
  Contrôle : `npm run mesure:volume`. Garde-fou : `lib/__tests__/volumeConcentre.test.ts`
  (7 cas, 3 rougissent si la répartition est retirée). 1065 tests verts.

- ~~**E15 · Un fichier a traîné 4 jours sans que PERSONNE ne puisse le voir**~~
  ✅ **OUTILLÉ le 2026-08-06** — `npm run check:suspens`.
  Constat : la déclaration de chiffrement Apple (E13-bis) est restée non committée
  pendant quatre jours dans le dépôt principal, **alors que le fondateur demandait des
  merges en permanence**. Personne n'était en faute.
  **La cause est structurelle** : chaque worktree a son propre répertoire de travail,
  et `git status` n'y montre que lui-même. Toutes les sessions voyaient « arbre propre »
  — la vérité, chez elles. Ce qui traînait dans le dépôt principal était invisible pour
  tout le monde, y compris pour celui qui posait la question.
  ➡️ **Le mécanisme qui évite les conflits (un worktree par session) CRÉE l'angle mort.**
  C'est le prix de l'isolement, et il ne se paie qu'une fois qu'on le sait.
  `scripts/check-suspens.mjs` parcourt `git worktree list` et fait le `status` de CHAQUE
  arbre — c'est le seul endroit d'où l'on voit l'ensemble. Il **sort en code 1** au-delà
  de 24 h : du travail en cours n'est pas un oubli, et un contrôle qui rougit tous les
  jours ne se lit plus. `node_modules` est filtré pour la même raison (il remonte en
  « non suivi » dans les worktrees antérieurs au `.gitignore` actuel).
  Première exécution : a trouvé `app.json` (3 j) et `mockups/` (3 j), et n'a PAS
  signalé les 8 fichiers de la session design en cours (0–1 h). Seuil bien placé.

- ~~**E14 · Le défilement et la fermeture étaient deux mondes séparés — et huit
  feuilles ne recevaient RIEN**~~ ✅ **CORRIGÉ le 2026-08-06, mesuré au simulateur.**
  Remonté par le fondateur après E12 : « on peut scroller le repas sans que ça ferme
  la feuille, j'aimerais fusionner les deux ». Sur iOS les deux gestes n'en font
  qu'un — arrivé en haut du contenu, on continue de tirer et la feuille suit.
  **Comment**, sans dépendance native : on ne peut pas reprendre le geste au
  `ScrollView` (son reconnaisseur est natif), **alors on se sert de lui**. Tirer
  au-delà du haut rend `contentOffset.y` NÉGATIF — le rebond élastique. Cette valeur
  EST le geste, déjà mesuré par le système ; `Sheet` la lit via un jeu de props
  (`sheetScrollProps`) posé sur le ScrollView de chaque contenu.
  ⚠️ Suivi à **0,5** et non 1 : le rebond décale déjà le contenu de `-y`, un suivi
  plein ferait filer l'écart à l'écran deux fois plus vite que le doigt.
  ⚠️ Le drapeau `dragging` n'est pas décoratif : les événements de défilement
  continuent d'arriver PENDANT le retour élastique, après le relâchement, et
  écraseraient l'animation de fermeture qu'on vient de lancer.
  🔴 **Trouvé en chemin, et plus grave que la demande** : `Sheet` testait
  `React.isValidElement(children)` — donc l'ENFANT UNIQUE. Le sélecteur d'éditeurs de
  Profil a **huit** enfants conditionnels (`{editor === 'info' && …}`) : `children` y
  est un TABLEAU, le test tombait à faux, et **plus rien n'était injecté**. Les huit
  éditeurs de profil n'ont donc jamais eu d'en-tête glissable — le code pour le faire
  était écrit, câblé, et **inerte**. Remplacé par `React.Children.map`, avec un filtre
  `typeof c.type === 'function'` pour n'injecter que dans nos composants et épargner
  les vues natives.
  **Périmètre vérifié un par un** (la demande était « check chaque point ») : contenus
  scrollables = `RecipeDetail`, `WeightCheckin`, `RecipeEditor`, `OffPlanHistory`,
  `EditorShell` (= 8 éditeurs). Sans défilement, donc hors sujet : `OffPlanSheet`,
  `DislikeSheet`, `FixedMealSheet`, `PlanCheckin`. ⚠️ Dans `WeightCheckin`, seul le
  ScrollView VERTICAL est équipé — la timeline horizontale ne doit pas fermer la feuille.
  Mesuré : fiche recette, tirer depuis le contenu ✅ ferme · défiler puis remonter
  ✅ ne ferme PAS · éditeur de profil, tirer depuis le titre ✅ ferme (ne marchait pas).
  ✅ **PUBLIÉ EN OTA le 2026-08-06** — group `98d5217a-b436-4a36-9e18-25dae16dfd13`,
  runtime `1.0.0`, commit `bf1dd2b`. Bundle vérifié avant de clore : Supabase **1 / 1**,
  `sk-ant-` **0**.

- ~~**E13 · Trois écarts corrigés dans la foulée**~~ ✅ **2026-08-05.**
  **(a)** Le bouton « Continuer » de l'onboarding était **plein et franc** alors qu'il
  refusait d'avancer — le seul retour arrivait APRÈS le clic. `PrimaryButton` ne
  connaissait que « actif » ou « mort » (`disabled` grise ET bloque le clic) : ajout d'un
  troisième état **`muted`**, atténué mais CLIQUABLE, pour que le bouton cesse de mentir
  sans perdre l'explication — et sans afficher un reproche d'entrée de jeu sur un écran
  encore vierge (cf. la règle « rassurer, jamais mettre la pression »).
  **(b)** La visite guidée annonçait « **Tes 7 jours de plan** » EN DUR alors que le plan
  suit `plan_days` : constante → fonction du nombre réel. Vérifié à 3 jours.
  **(c)** `EXPO_PUBLIC_ANTHROPIC_API_KEY` traînait encore dans `.env.local` alors que le
  chemin IA a été supprimé le 2026-07-31. Aucun code ne la lit (donc **pas** inlinée dans
  le bundle), mais la règle de CLAUDE.md §2 « clé côté SERVEUR, jamais côté client »
  n'était qu'**écrite** : elle est désormais **comptée** par
  `lib/__tests__/noClientAiKey.test.ts`, vérifié **par mutation** (il rougit et désigne le
  fichier fautif). 🧑 **Reste au fondateur** : nettoyer son `.env.local` et **révoquer la
  clé** si elle est encore active.

- ~~**E10 · `npm run deploy` ne déployait rien, et le faisait croire**~~
  *(publiée le 2026-08-02 sous le numéro **E9**, déjà pris depuis le 2026-07-31 par
  « un repas sauté peut laisser un trou muet » — renumérotée le 2026-08-04. Deuxième
  collision d'identifiant en deux jours, après A26 : le contrôle de doublons doit
  couvrir **tous** les préfixes, `E` compris, pas seulement A/B/C/D/P.)*
  ✅ **TRANCHÉ ET CORRIGÉ le 2026-08-04** (fondateur : « dis la vérité »). Sortie (b)
  retenue, plus une : `predeploy` devient **`build:web`** (l'export local reste utile,
  cf. E1), la dépendance `gh-pages` est **retirée** (elle ne servait qu'au script mort),
  et `deploy` devient `scripts/deploy-info.mjs` — qui explique le vrai chemin, imprime
  les trois derniers déploiements RÉELS (`gh run list`), et **sort en code 1**.
  ⚠️ **Le code de retour n'est pas cosmétique** : le piège d'origine était un script qui
  RÉUSSISSAIT sans rien faire. Supprimer l'entrée aurait donné « Missing script: deploy »
  — honnête, mais qui n'apprend rien à qui croyait déployer. Une sortie en erreur rend la
  confusion impossible, pour un humain comme pour un script.
  ✅ **Vérifié avant de couper**, comme la fiche l'exigeait : `gh api repos/:owner/:repo/pages`
  rend `build_type: workflow` — Pages sert l'artefact du workflow, la branche n'est servie
  nulle part. Aucun chemin de secours ne dépendait du script. *(Le dernier commit de
  `origin/gh-pages`, daté du 2026-08-02, est la trace de la session qui a cru déployer.)*

  <details><summary>Le constat d'origine</summary>

  `"deploy": "gh-pages -d dist"` pousse sur `origin/gh-pages`, **branche morte** depuis
  le passage à GitHub Actions : GitHub Pages sert l'artefact du workflow
  (`build_type: "workflow"`), pas cette branche. Le script s'exécute, affiche
  `Published`, et **n'a aucun effet sur le site**.
  ⚠️ Ce n'est pas théorique : il a induit un diagnostic entièrement faux le 2026-08-02
  (cf. A12), d'autant plus difficile à démonter que le site *se mettait* bien à jour —
  par le `git push` vers `main`, lancé au même moment.
  **Trois sorties possibles** : (a) supprimer `deploy` + `predeploy` et la dépendance
  `gh-pages` ; (b) les renommer `build:web` (l'export local reste utile pour inspecter
  un bundle, cf. E1) ; (c) les garder et documenter — déjà fait, mais un commentaire ne
  protège pas d'un script qui ment. **Recommandation : (b).**
  ⚠️ Vérifier avant de couper si un chemin de secours en dépend (publication manuelle si
  Actions tombe) — auquel cas c'est la CONFIGURATION Pages qu'il faudrait basculer, pas
  le script qu'il faudrait garder.

  </details>

- ~~**E1 · Trancher le sort de `lib/generatePlan.ts`**~~ ✅ **SUPPRIMÉ le 2026-07-31 —
  et il ne s'agissait pas de code mort inoffensif.** La reco disait « ~120 lignes
  mortes + piège de sécurité » ; les deux moitiés ont été **vérifiées sur le bundle
  RÉELLEMENT DÉPLOYÉ** avant de couper, pas sur le code source :
  `curl` sur `entry-….js` (3,3 Mo servis à chaque visiteur) → **35 occurrences de
  `anthropic`**, la chaîne `sk-ant-` et le prompt système en clair. Le chemin n'a
  jamais tourné (la clé n'a jamais été posée), mais le SDK, lui, était bien livré.
  **Mesuré, export web avant/après** : `3 500 427` → `3 271 142` octets, soit
  **−224 Ko (−6,6 %)**, zéro trace résiduelle. 768 tests verts, `tsc` propre.
  ⚠️ **La pause de 600 ms a été CONSERVÉE**, déplacée dans `plan.tsx`. Elle vivait
  dans `generateMealPlan` sous l'étiquette « UX : transition fluide » et n'avait rien
  d'une attente réseau : `buildLocalPlan` génère un plan 7 jours en **~8 ms** (mesuré,
  médiane sur 30 générations), donc elle représente 98 % du temps perçu. La retirer
  est une décision d'UX — pas du nettoyage — et n'a donc pas été prise ici.
  ⚠️ `@anthropic-ai/sdk` est retiré de `package.json` **et** du `package-lock.json`,
  mais PAS de `node_modules` (partagé avec une session parallèle) : un `npm install`
  local le fera disparaître. La CI fait `npm ci` → elle ne l'installe déjà plus.
- ~~**E2 · Journal des migrations appliquées**~~ ✅ **CRÉÉ le 2026-07-31** :
  `supabase/JOURNAL-MIGRATIONS.md`. Il ne liste pas des intentions — il consigne un
  ÉTAT VÉRIFIÉ et la commande d'une ligne qui permet de le re-vérifier sans dashboard
  (une colonne absente fait répondre `400` à PostgREST, présente `200`).
- ~~**E3 · Trancher le compte invité**~~ ✅ **DÉJÀ TRANCHÉ — le provider est COUPÉ.**
  ⚠️ **L'entrée précédente affirmait l'inverse et il faut le savoir** : elle disait
  « LE DOUTE EST LEVÉ, le provider EST OUVERT », mesuré le 2026-07-31 par un
  `POST /auth/v1/signup` à corps vide. **Re-mesuré le 2026-08-01 sur l'endpoint de
  configuration, en lecture seule** (`GET /auth/v1/settings`, aucun compte créé) :

      external_anonymous_users : false
      disable_signup           : false
      mailer_autoconfirm       : true

  Le provider anonyme est **désactivé**. Soit il a été coupé entre-temps, soit la
  mesure du 2026-07-31 touchait un autre chemin que celui qu'emprunte l'app
  (`signInAnonymously()`). Dans tous les cas la décision est prise et il n'y a plus
  d'arbitrage à rendre : ni rate-limit à régler, ni CAPTCHA à brancher.
  ✅ **Vérifié à l'écran** : le bouton « Continuer en invité » répond *« Connexion
  invité indisponible. Active l'auth anonyme dans Supabase. »* — le message est juste.

  🟢 **RE-MESURÉ le 2026-08-01 (plus tard dans la journée) : le provider est de nouveau
  OUVERT.** `GET /auth/v1/settings` renvoie désormais `external_anonymous_users: true`.
  **Preuve par l'usage, pas par l'endpoint** : `npm run store:assets` — qui passe par
  `guestLogin` comme tous les scripts Playwright — s'est exécuté de bout en bout et a
  produit 5 captures d'un plan réellement généré. **Les parcours Playwright refonctionnent.**
  ⚠️ **La leçon, c'est la troisième mesure contradictoire sur ce réglage en deux jours**
  (ouvert le 07-31, fermé le 08-01, ouvert le 08-01). Il est piloté depuis le dashboard,
  hors du dépôt : **aucune trace écrite ici ne peut être tenue pour à jour.** Avant de
  conclure qu'un parcours est cassé, RELANCER la mesure — c'est une commande d'une ligne.
  La sortie durable reste la même : un compte de test dédié (`storageState` réutilisé)
  ferait cesser cette dépendance à un réglage qui bouge sans prévenir.
  ⚠️ `mailer_autoconfirm: true` : une inscription e-mail est active immédiatement,
  sans confirmation. C'est ce qui rend un compte de test dédié facile à créer — **par
  le fondateur**, pas par un assistant.
- ~~**E4 · Nettoyages**~~ ✅ **TRAITÉ le 2026-07-31 — mais une des trois demandes a été
  REFUSÉE, mesure à l'appui.**
  - ✅ `kcalMargin()` supprimée, ainsi que `DAILY_KCAL_MARGIN_PCT` qui n'existait que
    pour elle (rien d'autre ne la lisait) et les 2 tests qui la couvraient.
  - ✅ `.env.example` créé — il liste les **4** variables `EXPO_PUBLIC_*` réellement lues
    par le code et dit, pour chacune, si elle peut être publique. Le `.gitignore` avait
    déjà la ligne `!.env.example` en attente.
  - 🚫 **Clés Supabase → secrets GitHub : NON FAIT, volontairement.** La demande partait
    du principe qu'une clé dans `deploy.yml` est une clé exposée. **Elle l'est déjà, et
    le restera** : `EXPO_PUBLIC_SUPABASE_ANON_KEY` est retrouvée **en clair dans le
    bundle déployé** (`grep sb_publishable_…` sur `entry-….js` → 1 occurrence), parce
    qu'Expo inline les `EXPO_PUBLIC_*` à la compilation et que le navigateur DOIT
    l'avoir pour parler à Supabase. C'est la RLS qui protège les données, pas le secret
    de cette clé — d'où son préfixe `sb_publishable_`.
    Le déplacer n'aurait donc réduit **aucune** surface d'attaque, et aurait ajouté un
    **échec silencieux** : secret absent ou mal nommé → build vert, bundle déployé avec
    `createClient('', '')`, connexion morte en prod sans un message d'erreur.
    **Ne pas relancer ce chantier sans un argument nouveau.** Ce qui reste vrai et est
    écrit dans `.env.example` : une clé qui doit VRAIMENT rester secrète ne passe pas
    par `EXPO_PUBLIC_*` du tout, elle vit côté serveur.
  ✅ *Le recomptage Ciqual réclamé ici est **FAIT** (2026-07-30)* : les chiffres qui se
  contredisaient (« 86/113 », « 99/113 », « 81/102 ») sont tous périmés. Mesure autoritaire,
  via le module lui-même : **123 ingrédients, 107 sourcés Ciqual, 16 saisis à la main**.
- ~~**E5 · Open Food Facts**~~ ✅ **TRANCHÉ le 2026-07-30.** La ligne de `CLAUDE.md` §2
  annonçait OFF en source secondaire : **il n'a jamais été branché**, zéro ligne de code.
  Décision : **les ajouts d'aliments se font À LA MAIN**, pas via une source tierce
  automatique (données OFF = contributions libres, qualité inégale). §2 corrigé et
  documenté : un aliment manquant s'ajoute à `ingredients_reference` avec ses macros
  /100 g, mappé Ciqual si un équivalent propre existe.
- ~~**E8 · « rentrer dans ta cible » promet l'impossible aux petits gabarits**~~ ✅
  **CORRIGÉ le 2026-07-31.** ⚖️ *Arbitrage tranché en session : on REFORMULE, on
  n'étale pas le reliquat sur la semaine.* Étaler, c'est exactement la banque de
  calories — une brique **Kyroz+** (cf. `MONETISATION.md`) : la donner gratuitement
  aux écarts non planifiés viderait le paywall qui reste à poser (B2). Et faire
  bouger les cibles des jours suivants sur un événement non planifié est un rayon
  d'action large juste avant la sortie. Ça reste la bonne extension premium plus tard.
  `adaptDayOptions` expose désormais `absorbedKcal` (ce que l'option REPREND) et
  `overTargetKcal` (ce qui reste au-dessus). Quand aucune option n'approche la cible,
  l'écran le dit — sans alarme : ce qui est repris est mis en avant, le reste est
  présenté comme sans conséquence, *parce qu'il l'est*.
  ⚠️ **Seuil = `ON_TARGET_TOLERANCE_KCAL` (100), SOURCE UNIQUE** partagée avec
  `MacroBar` : à zéro, l'écran annonçait « on n'y arrive pas » pour un reliquat de
  **6 kcal** pendant que la barre juste dessous affichait « ✓ dans la cible ». Deux
  seuils = deux écrans qui se contredisent.
  ⚠️ Corrigé au passage : `adaptDayOptions` lisait le CACHE `total_macros_per_day`
  pour sa référence. Un appelant qui oublie de le rafraîchir après un écart faisait
  afficher « reprend 0 kcal » partout. La référence est recalculée. 5 tests.
- ~~**E9 · Un repas sauté peut laisser un trou muet**~~ ✅ **CORRIGÉ le 2026-07-31.**
  La barre affichait déjà l'écart (« Cible 2 104 · −214 ») en couleur d'alerte, sans
  un mot. `SousCibleNote` explique la cause réelle (les portions restantes sont à
  leur maximum) et referme sans mise en pression. Même seuil que la barre.
  ✅ **VÉRIFIÉS À L'ÉCRAN le 2026-07-31** (session locale du fondateur, cible 2112) :
  écart de +1000 kcal → *« Une seule journée ne peut pas tout reprendre… »* avec
  « reprend 510 / 575 / 120 kcal » sous chaque option (la meilleure reste 413 au-dessus,
  et l'écran ne le cache plus) · journée à 1435 kcal → *« Ta journée s'arrête 677 kcal
  sous ta cible : les portions de tes repas ne peuvent pas monter plus haut. Une journée
  sous la cible ne compromet rien. »* Plan du fondateur restauré après vérification.
- ~~**E6 · Hors-plan — le libellé est jeté, et il n'y a pas d'historique**~~
  ✅ **CLOS le 2026-08-05.** Les deux points sont livrés.

  ✅ **Point 1 livré** : `OffPlanSheet` remonte `onLog(kcal, label?)`, le plan porte
  `DayExtra = Macros & { label?: string }`, et la ligne du jour affiche
  « + 234 kcal assumées **· Pizza (aliment moyen) · 100 g** ».
  · Le libellé garde la QUANTITÉ en mode aliment : « Pizza » et « Pizza · 300 g » ne
    racontent pas la même journée.
  · Il est **absent** quand on tape un nombre à la main dans « estimer vite » — il n'y a
    rien à nommer, et une chaîne vide serait un faux nom.
  · Il **survit à une régénération** (`carryTracking`), comme le reste du suivi. Garde-fou
    dans `carryTracking.test.ts`, **vérifié par mutation** : un report qui perd le libellé
    fait rougir le test.
  · Lecteur immédiat, donc **pas de champ orphelin** — la leçon d'A8, appliquée le jour
    même où on l'a payée.
  🔎 Vérifié à l'écran (pizza 100 g → 234 kcal), zéro erreur console, valeur persistée.

  ✅ **Point 2 livré le 2026-08-05 — l'historique, LOCAL-ONLY** (`lib/offPlanJournal.ts`,
  clé `@kyroz:offPlan`, écran `components/OffPlanHistory.tsx` ouvert depuis Profil →
  « Repas hors plan »). **Aucune migration Supabase.**

  **Le fait qui a reformulé la question** : un écart vivait **moins de 24 h**.
  `resetTracking` efface `day_extras` au changement de jour calendaire — donc le libellé
  du point 1 s'affichait le jour même, puis disparaissait.

  **Pourquoi local-only, et ce n'était PAS l'autre branche d'un choix.** Dans Kyroz, toute
  donnée synchronisée a **déjà** une clé locale comme source de travail (`lib/sync.ts` :
  6 clés ↔ 6 tables ; `CLAUDE.md` §3). La table n'est pas une alternative à la clé, c'est
  un **miroir** posé dessus — donc local-only est la première moitié des DEUX versions, et
  ne ferme aucune porte. À l'inverse, une table où des utilisateurs ont déjà des données ne
  se supprime pas à la légère. S'ajoutent trois raisons mesurées :
  · la fiche annonçait « une table et une migration » ; en comptant sur le code réel, c'est
    **six surfaces** — `schema.sql`, une migration **à jouer à la main**, `lib/sync.ts`, la
    liste de 6 tables de l'Edge Function `delete-account`, `docs/politique-confidentialite-kyroz.md`
    (un texte **juridique**) et `RGPD-REGISTRE.md` — avec le mode de panne déjà payé (une
    migration non jouée tue la synchro **en silence**, incident `weight_logs` du 14 juin) ;
  · `meal_plans` a été **supprimée le 2026-06-14** parce que le plan est déterministe :
    rouvrir une table pour une donnée qui vit dedans annulerait cette décision ;
  · RGPD — un relevé daté de ce qu'on a mangé hors plan est une donnée de comportement
    alimentaire ; même traitement que les photos de progression. Une clé locale hérite
    **gratuitement** des deux garde-fous existants : `exportData.ts` balaie toutes les clés
    `@kyroz:*` (donc l'historique est dans l'export RGPD sans une ligne de plus) et
    « effacer mes données » l'efface aussi sans une ligne de plus.

  ⚠️ **L'écran N'EST PAS UN COMPTEUR, et c'est ce qui le tient debout.** Une liste de
  dérapages avec un total serait un carnet de fautes — la charge mentale que le produit
  refuse (`CLAUDE.md` §10). Donc : aucun total, aucune moyenne ; chaque ligne dit ce que le
  **moteur** a fait de l'écart (`AdaptOption.absorbedKcal`, déjà calculé) ; et la ligne de
  menu affiche la **période couverte**, jamais un nombre — un test exige que le résumé soit
  identique pour une entrée et pour douze sur la même période.
  ⚠️ **Décision inconnue ≠ « journée gardée ».** Si l'app est quittée avant l'arbitrage, la
  ligne se TAIT au lieu de supposer (`describeOutcome` → `null`). Vérifié par mutation.
  ⚠️ **Le journal remplace par couple date+jour, il n'empile pas** : `day_extras[jour]` est
  un slot unique, donc un second écart le même jour écrase le premier dans le moteur. Un
  journal qui empilerait afficherait un total que le moteur n'a jamais compté. Garde-fou
  vérifié par mutation.
  ⚠️ **Bornes** : 180 jours et 200 entrées. Ce n'est pas une protection de stockage (~60 o
  par entrée) — c'est la réponse à « un écart d'il y a trois mois, ça sert à quoi ? », et
  de la minimisation RGPD gratuite.
  🔎 Vérifié à l'écran de bout en bout : pizza 300 g → 702 kcal → « répartir » →
  `absorbed: 510`, **le chiffre exact que la feuille promettait** ; puis « je garde mon
  plan » → `absorbed: 0` ; suppression d'une ligne persistée. Zéro erreur console.
  🐛 **Ce chantier a mis au jour un défaut PRÉ-EXISTANT** — toute boîte de dialogue ouverte
  depuis une feuille était invisible. Voir l'entrée dédiée ci-dessous et `CLAUDE.md` §11.

  <details><summary>Le constat d'origine</summary>
  *Tracé le 2026-07-31 : le nom EXISTE au moment de la saisie et il est jeté.*
  `OffPlanSheet` connaît `picked.name_fr` (mode « chercher un aliment ») ou le libellé
  du chip (mode « estimer vite »), mais sa prop est `onLog: (kcal: number) => void`.
  Le stockage est `plan.day_extras[jour]` = un simple `Macros`.
  ⚠️ **Deux chantiers, pas un — ne pas les confondre :**
  1. **Garder le libellé** (petit) : `onLog(kcal, libellé)` + un champ additif sur le
     plan + l'afficher dans la ligne « + 450 kcal assumées ». Lecteur immédiat, donc
     pas de champ orphelin (cf. le piège A8).
  2. **L'historique des écarts** (le vrai objectif de cette entrée) : **impossible par
     le 1 seul**. Le plan n'est PAS synchronisé et se régénère (`CLAUDE.md` §3 : il est
     déterministe, re-dérivable) — tout ce qui vit dedans est éphémère. Un historique
     demande un journal persistant à part, sur le modèle de `weight_logs`, donc une
     clé de stockage + probablement une table Supabase + une migration.
  ➡️ Faire le 1 ne « fait » pas E6. Le 2 est une petite feature, pas de la dette.
  </details>
- ~~**E11 · Toute boîte de dialogue ouverte depuis une FEUILLE était invisible**~~
  ✅ **CORRIGÉ le 2026-08-05** (`components/Dialog.tsx`). Trouvé en livrant E6, mais le
  défaut est **pré-existant** et touchait du code livré depuis longtemps.

  **Le symptôme est le pire qui soit** : le code s'exécutait, la promesse attendait son
  arbitrage, et l'utilisateur ne voyait RIEN. Aucune erreur, aucune trace — le `confirm`
  était dans le DOM et sous la feuille. C'est exactement la famille d'`Alert.alert`, à qui
  ce module devait justement servir de remplaçant.

  **Cause, mesurée** : react-native-web crée le conteneur DOM d'une `Modal` **à son
  MONTAGE**, pas quand elle devient visible. `DialogProvider` vit à la racine de l'app, donc
  son conteneur naissait au démarrage — **avant** celui de n'importe quelle feuille ouverte
  ensuite. Les deux portent `z-index: 9999` : à égalité, c'est l'ordre du DOM qui tranche,
  et la feuille passait par-dessus. Relevé en direct : conteneur du dialogue à
  `body > div[2]`, celui de la feuille à `body > div[7]`.

  **Correctif** : monter l'`ActionSheet` du fournisseur seulement quand une demande existe
  (+ 260 ms pour laisser l'animation de sortie). Le conteneur naît alors en DERNIER, donc
  au-dessus.

  ⚠️ **Deux chemins réparés, dont un LIVRÉ** : « Supprimer cette pesée ? » (`WeightCheckin`,
  dans une feuille) était mort sur le web, et personne ne l'avait vu ; et la suppression
  d'une ligne du journal des écarts (E6). Non-régression vérifiée sur un dialogue ouvert
  HORS feuille (« Régénérer tout ton plan ? »).
  ⚠️ **Invisible sous vitest** (pas de DOM) **et à la relecture** (le code a l'air juste) :
  le garde-fou de `noAlert.test.ts` ne mesure pas le défaut, il empêche qu'on retire le
  montage conditionnel en croyant simplifier. Vérifié par mutation.
  ➡️ **Un composant qui a corrigé un piège peut en porter un du même genre.** Ici, le
  remplaçant d'`Alert` échouait dans le même silence qu'`Alert`.
  🔴 **CETTE LIGNE DISAIT « Non re-testé sur iOS », ET C'ÉTAIT LE VRAI SUJET.**
  Mesuré sur le WEB uniquement — sur natif, `Modal` est une modale de plateforme et
  l'ordre de présentation n'obéit pas au DOM. **Neuf jours plus tard (E42), le
  build natif a montré que le natif avait sa propre panne, plus grave : iOS refuse
  purement et simplement la seconde modale, et CINQ gestes étaient morts — dont
  « Supprimer mon compte ».** Le correctif d'ici règle le web et ne dit rien du
  natif. ➡️ *Une inconnue consignée n'est pas une inconnue traitée* : cette note
  était juste, lisible, et personne n'est allé voir.
- ~~**E7 · Deep links web → HTTP 404** (le rendu était bon, le statut était faux)~~
  ✅ **CORRIGÉ le 2026-08-04.** `app.json > expo.web.output: "static"` — chaque route est
  pré-rendue en HTML, donc GitHub Pages sert un fichier réel au lieu de retomber sur
  `404.html`.

  📊 **Mesuré sur l'ARTEFACT, pas sur l'intention.** Les deux exports ont été servis par
  un serveur qui IMITE la résolution d'URL de Pages (`/foo` → `foo.html`, repli 404) :
  `python3 -m http.server` ne la fait pas, et aurait rendu une mesure muette.

  | | `/Kyroz-app/plan` | fichiers HTML | poids du site |
  |---|---|---|---|
  | avant (`single`) | **404 Not Found** | 3 | 8,9 Mo |
  | après (`static`) | **200 OK** | 19 | 9,3 Mo |

  ⚠️ **Le blocage annoncé par la fiche était RÉEL — c'était le client Supabase.** Le
  pré-rendu s'exécute dans **Node** ; `createClient` ne se contente pas de construire, il
  **démarre sa session** (`_emitInitialSession` → `__loadSession` → `getItem`), ce qui
  atteint `window.localStorage`. Le build mourait sur `ReferenceError: window is not
  defined` avant d'avoir rendu une seule route. Correctif : un **stockage muet** pendant
  le pré-rendu, et lui seul.

  🔴 **Le vrai danger n'était pas le build, c'était l'inverse.** Si un appareil RÉEL
  tombait dans cette branche, il perdrait sa session à chaque démarrage, **en silence**.
  Le prédicat teste donc `Platform.OS === 'web'` **en plus** de `window` : React Native
  définit `window` aujourd'hui (alias de `global`), mais c'est un détail de runtime, pas
  un contrat. `Platform.OS` exclut le natif par construction.
  ⚠️ Ce cas ne peut se produire ni dans un navigateur ni dans vitest — **aucun test
  d'intégration ne le verrait**. D'où un prédicat PUR dans `lib/prerender.ts`, fichier
  **sans aucun import** (`lib/supabase.ts` tire `react-native-url-polyfill`, qui explose
  sous vitest : un garde-fou qu'on ne peut pas tester n'est pas un garde-fou).
  Garde-fou `supabaseStorage.test.ts`, **vérifié par mutation** : retirer la garde
  `Platform` fait rougir « iOS et Android ne peuvent PAS y tomber ».

  ℹ️ Le HTML pré-rendu reste un **shell vide** : l'app est derrière l'authentification, il
  n'y a rien à indexer. Ce qui est corrigé est le **statut**, pas le contenu — c'était
  l'objet de la fiche. `deploy.yml` garde son `cp dist/index.html dist/404.html` : le
  repli sert désormais aux URL réellement inconnues, et lui seul rend un vrai 404.
  ℹ️ Aucune route dynamique dans l'app (`app/**/[*]` est vide) : les 19 routes se
  pré-rendent toutes, pas de `generateStaticParams` à écrire.

  <details><summary>Le constat d'origine</summary>
  Mauvais SEO. Contournement en place. **Faible priorité.**
  *Cause identifiée le 2026-07-31* : `app.json > expo.web` ne contient qu'un `favicon`,
  donc `output` vaut son défaut **`"single"`** — une seule page, toutes les routes
  servies par le repli `404.html` (que `deploy.yml` fabrique en copiant `index.html`).
  GitHub Pages renvoie donc un vrai 404 avec le bon contenu.
  ⚠️ **Le correctif propre existe mais n'est PAS anodin** : `"output": "static"`
  pré-rend chaque route en HTML → vrais 200. Mais le rendu statique exécute les écrans
  hors navigateur : tout module qui touche `localStorage`/AsyncStorage au chargement
  casse le build. À ne tenter que sur une branche, avec l'export vérifié route par
  route — pas la veille d'une sortie store.
  </details>

- ~~**E22 · 🤖 Finir la passe émoji — 9 en restent AFFICHÉS**~~ ✅ **LIVRÉ le
  2026-08-09 — et cette fois un COMPTEUR l'exige** (`lib/__tests__/emojiInterface.test.ts`,
  3 mutations). Recomptés avant de commencer, comme la fiche l'ordonnait : **exactement 9**
  (8 dans `streak.ts`, 1 dans `legal.ts`) — le chiffre du 2026-08-08 a tenu. Partis avec eux :
  le ⚠️ du miroir `public/legal.html`, et celui d'un `console.warn` de `sync.ts`.

  🔴 **LA DÉCISION DE DA EST TRANCHÉE, ET PAS SUR UN ARGUMENT D'ÉMOJI** (fondateur,
  2026-08-09). Les trois options étaient `ReussiteIcon`, le seul chiffre, ou rien. C'est
  **le chiffre**, pour une raison qui n'a rien à voir avec le pictogramme : 🔥 3 j · 🎉 7 j ·
  💪 14 j · 🏆 30 j · ⭐ 60 j · 👑 au-delà, c'est une **échelle de badges**, donc de la
  *collection* — la moitié exacte de ce que `CLAUDE.md` §5 interdit. Six TRACÉS auraient
  gardé le défaut en le rhabillant aux couleurs de la DA : une vignette par palier reste
  une vignette à débloquer. ➡️ **Le nombre de jours devient l'objet visuel**, dans l'accent.
  Il n'y a plus rien à collectionner.
  ⚠️ **Et ça a fait tomber un angle mort de `typoDA`** : le `fontSize: 56` de la célébration
  passait depuis toujours grâce à la clause « un émoji dimensionné n'est pas de la
  typographie » — clause déclenchée par le NOM du style (`emoji:`). Le chiffre est de la
  typographie, donc il passe par `Type.hero` (40), et le test refuse désormais ce 56.
  **Une exemption qui se déclenche sur un nom de variable survit à la raison qui la
  justifiait.**

  ⚠️ **Ce que le compteur a coûté à écrire, et c'est la vraie leçon du lot.** Deux versions
  fausses avant la bonne, **toutes deux rendant un résultat parfaitement plausible** : la
  première ne filtrait que les commentaires en DÉBUT de ligne (la méthode que §8 recommandait)
  et rendait **58** occurrences là où il y en a 11 — 47 faux positifs, tous des ⚠️ et 🔴 posés
  après du code ; la seconde condamnait le `®` de « Table Ciqual® 2025 », qu'Unicode classe
  `Extended_Pictographic` et qui n'est pas un émoji pour un sou. ➡️ **Un compteur se mesure
  avant de mesurer** — d'où le test qui vérifie qu'il sait dire OUI (il voit un émoji, ignore
  un commentaire, ne prend pas `https://` pour un commentaire).
  ⚠️ Corollaire : le ⚠️ de `sync.ts` n'était **pas** de l'interface (c'est un `console.warn`),
  mais le laisser obligeait le test à s'écrire **une exception par fichier** — et une liste
  d'exceptions est une invitation à en ajouter une. Réponse attendue : **zéro, partout, sans
  dérogation.**

  *Historique de la fiche, conservé — c'est lui qui explique pourquoi le compteur existe :*
  ⚠️ *Écrite sous le numéro **E17** — déjà pris sur `main` par « une case laissée vide
  voulait dire je m'entraîne 7 j/7 ». Renumérotée **E22** à la fusion (2026-08-08),
  **quatrième collision de la journée** : cf. E19/E20, A28/A29, A29/A30. Un identifiant
  choisi sur une branche est une réservation que personne d'autre ne voit — il se prend
  au moment de FUSIONNER, en regardant `main` ET les branches en aval.*

  🔴 **Le compte disait 13, il en reste 9 — et les DEUX étaient justes à leur date.**
  Les 4 de `notifications.ts` sont partis le 2026-08-07, agrafés au travail qui touchait
  ce fichier pour une autre raison. **Re-mesuré le 2026-08-08 sur l'arbre fusionné**
  (lignes de commentaire écartées, `\p{Extended_Pictographic}` sur le reste) :

  | Fichier | Combien | Ce qui l'affiche |
  |---|---|---|
  | `lib/streak.ts` (paliers) | 6 — 🔥 🎉 💪 🏆 ⭐ 👑 | `StreakCelebration` en **56 px**, écran Plan |
  | `lib/streak.ts` (`streakMessage`) | 2 — 🎯 🎉 | `StreakProgress` *(supprimé le 2026-08-14)* |
  | ~~`lib/notifications.ts`~~ | ~~4~~ → **0** | ✅ partis le 2026-08-07 |
  | `constants/legal.ts` | 1 — ⚠️ | écran `/legal` (CGU) |

  ➡️ **Ce chiffre BAISSE tout seul** : il se re-compte avant d'être cité, jamais recopié.
  C'est exactement le défaut que la fiche dénonce plus haut — un inventaire juste le jour
  où il est écrit, faux le lendemain, et recopié entre-temps.

  **Deux natures, pas une.** Le ⚠️ de `legal.ts` est mécanique : la phrase se reformule
  et tient sans (patron « Noté 👎 » → « C'est noté »). Les **6 paliers sont un objet
  VISUEL de 56 px** — les remplacer par
  `ReussiteIcon`, par le seul chiffre, ou par rien, est un choix de DA à poser au
  fondateur **au moment de le faire**. La décision acquise est « ça part », pas
  « ça devient X ».

  ⚠️ **Poser un COMPTEUR dans le même lot**, sinon la passe se redéclarera finie
  toute seule — c'est exactement ce qui vient de se produire. La passe du
  2026-08-06 a compté sur `app/` + `components/`, s'est déclarée terminée, et la
  conclusion a été recopiée à trois endroits (message de commit, commentaire de
  `Icons.tsx`, `CLAUDE.md` §8) où les trois copies se confirmaient l'une l'autre.
  ➡️ **Un inventaire d'interface se compte sur ce qui est AFFICHÉ**, pas sur les
  fichiers qui ressemblent à de l'interface : ces chaînes vivent dans `lib/` et
  `constants/` et remontent à l'écran via un composant qui n'en contient aucune.

### 🚫 F — Volontairement reporté : NE PAS RELANCER

Ce ne sont pas des oublis, ce sont des décisions. Les remonter dans un bilan fait perdre
du temps au fondateur.

- **Validation par une diététicienne** — écartée le 2026-07-29. Ne plus la citer comme
  prérequis. (Ce qui reste vrai : `validated_by_dietitian` est `false` en dur, donc **aucun
  écran ne doit prétendre le contraire**.)
- ~~**PostHog** — câblé et dormant, il manque la clé.~~ ✅ **ACTIF depuis le 2026-08-18** —
  trois verrous levés (IP, DPA, rétention réécrite), clé posée. ⚠️ **Sur le WEB seulement :
  l'OTA n'est pas publié** (report du fondateur), donc les binaires n'ont ni la clé ni les
  nouveaux textes — et ils ne mentent pas pour autant, voir ci-dessous.
  Voir `RGPD-REGISTRE.md` et `PROCEDURE-2026-08-18-activation-posthog.md` §6.
- **Photos cloud / premium** — le MVP local existe ; le reste ne devient intéressant que
  si le premium existe.
- **Volume concentré** — le plan sous-alimente le jour de la séance longue. Chantier
  reporté, à ressortir à une prochaine mise à jour du moteur.
- **Approche B « fourchette » de macros** — après tests utilisateurs.
- **« Limites par conception »** d'`adaptRecipe` / `tightenDay` signalées par des
  auditeurs : ce ne sont **pas des bugs**, ce sont des arbitrages assumés.

## État du dépôt — remis à plat le 2026-07-30

> ⚠️ **Le SHA ci-dessous est celui du 2026-07-30.** Ne pas le prendre pour l'état courant :
> lire `git log --oneline -1`. Le principe qui compte est celui du paragraphe, pas le SHA.
>
> **Astuce mesurée le 2026-07-31** : un worktree n'oblige PAS à réinstaller 1,5 Go de
> `node_modules` — un lien symbolique vers celui du dépôt principal suffit (vitest, tsc et
> `expo export -p web` tournent tous dessus). ⚠️ Mais `.gitignore` dit `node_modules/`
> **avec la barre finale**, qui ne matche que les répertoires : le lien symbolique, lui,
> apparaît en `?? node_modules` et **un `git add .` le committerait**. Ajouter les fichiers
> un par un.

**Une seule branche, un seul worktree, arbre de travail propre.** `main` = `origin/main` = `30b0c19`.
Les 9 branches de travail étaient toutes intégralement mergées : supprimées en local et sur le
distant, ainsi que les worktrees `Kyroz_Code-neat` et `Kyroz_Code-recettes` (≈ 1,5 Go de
`node_modules` libérés). `origin/gh-pages` est l'artefact de déploiement — **ne jamais y toucher**.

SHA conservés au cas où une branche devrait être ressuscitée (`git branch <nom> <sha>`) :
`audit/brief-etat` 0aec5ac · `chore/email-contact-unifie` 1e1c683 · `docs/maj-apres-audit` f6523df ·
`feature/vague-recettes-80` 1b7e367 · `fix/drapeaux-muets` 6cc2510 · `fix/libelles-neat` 9ffe195 ·
`fix/moteur-p0-securite` fe3a13d · `fix/moteur-p05-p06` 0f3b873 · `fix/moteur-p1-etapes-1-2` 353e1d8.

Reste un `stash@{0}` (« edition-kevin-vague-100-superseded-par-113 ») : une ligne du brief éditée
par le fondateur, **entièrement réalisée** par la vague de 113. C'est son contenu, à lui de la jeter.

⚠️ **Le fondateur veut repartir d'une base saine.** Si plusieurs sessions travaillent à nouveau en
parallèle, recréer des worktrees — mais les nettoyer en fin de chantier, pas les laisser.

### ▼ Mise à jour du 2026-08-06 — ils ont été laissés

Le paragraphe ci-dessus (« une seule branche, un seul worktree ») **n'est plus vrai depuis
longtemps**, et son propre avertissement — « les nettoyer, pas les laisser » — n'a pas été suivi.
Mesuré le 2026-08-06 : **7 arbres de travail**.

| Arbre | Branche | État |
|---|---|---|
| `Kyroz_Code` (principal) | `main` | ✅ à jour |
| `app-issues-fixes-63d801` | `claude/app-issues-fixes-63d801` | ✅ tout dans `main` |
| `autre-tache-parallele-1af7f5` | `claude/design-session-701e7e` | ✅ commits dans `main` — **session ACTIVE**, 10 fichiers non committés |
| `body-fat-provenance-audit-23f355` | `claude/body-fat-provenance-audit-23f355` | ✅ tout dans `main` |
| `Kyroz_Code-design-avant` | (détaché) | ✅ tout dans `main` |
| `b2-revenuecat` | `worktree-b2-revenuecat` | ✅ tout dans `main` |
| **`design-audit`** | **`worktree-design-audit`** | 🔴 **5 commits HORS de `main`** |

🔴 **`worktree-design-audit` porte du travail qui n'est nulle part ailleurs** : 5 commits du
2026-08-05, **55 fichiers, +1 585 / −853**, dont **trois fichiers de tests** —
`typoDA.test.ts`, `espacementDA.test.ts`, `finitionsDA.test.ts` (échelle typographique,
espacement porteur de sens, finitions : trait, icône, retour au toucher).
Vérifié un par un : ni les titres de commit, ni les trois fichiers n'existent dans `main`.
**Ce n'est donc pas un doublon d'une passe déjà livrée.** À merger ou à abandonner
explicitement — mais pas à laisser dans le troisième état.

➡️ **Ce constat n'a été possible que parce qu'on a REGARDÉ les autres arbres.** Depuis
n'importe quel worktree, `git status` répond « propre » et `git log` ne connaît que sa
branche : du travail entier peut dormir à côté sans qu'aucune session ne le soupçonne.
`npm run check:suspens` montre les fichiers non committés de tous les arbres ; pour les
COMMITS non mergés, la commande est :
`git worktree list` puis `git rev-list --count origin/main..<branche>` sur chacune.

---

# 📖 RÉFÉRENCE — comment le produit marche

## Décisions verrouillées (cf. CLAUDE.md)
- Freemium large : core loop 100 % gratuit, sans clé API.
- Génération **LOCALE** (`lib/planEngine.ts`) — **seul chemin depuis le 2026-07-31**. Le chemin IA (`lib/generatePlan.ts`) est supprimé, cf. E1.
- Supabase = auth + sync best-effort (offline-first, RLS stricte). Plan non synchronisé (déterministe) ; photos LOCAL-ONLY (RGPD).
- ⚠️ **Règle qui SURVIT à la suppression du chemin IA** : aucune clé de service ne passe par une variable `EXPO_PUBLIC_*`. Expo les remplace par leur valeur À LA COMPILATION → elles sont lisibles dans le bundle public. Si l'IA revient → Edge Function Supabase (clé serveur), pas côté client. Gabarit et liste des variables : `.env.example`.

## Garde-fous PARTOUT (CLAUDE.md §6)
Plancher = énergie disponible (30 kcal/kg de masse maigre + sport, **plafonné au TDEE**), filet absolu 1500 ♂ / 1200 ♀ ; déficit ≤ 25 % du TDEE **sur tous les chemins** ; plancher lipidique 0,8 g/kg de masse maigre ; **pas < 18 ans** (`lib/safety.ts::MIN_AGE`) ; déficit annulé sous IMC 18,5 ; disclaimer affiché ; fallback plan (jamais d'erreur vide).

## Core loop & moteur
- **Onboarding** (`app/(auth)/onboarding.tsx`, **7 étapes** — l'écran d'accueil n'est pas numéroté, d'où « ÉTAPE x / 6 » ; précédé du portail de dépistage santé) : prénom (1er, requis, local-only `lib/profileName.ts`) → infos de base + **%MG requis** (`BodyFatPicker`, 6 rendus 3D `assets/bodyfat/{male,female}-N.png`, sources dans `_source/`) → **sports** (`SportsEditor` : type + fréquence + durée, ou « je ne fais pas de sport ») → objectif → **préférences** (régime, protéines préférées, aliments à éviter + saisie libre, temps prépa, **+ variété des repas** — l'écran Variété autonome a été fusionné ici 2026-06-20, −1 étape) → **jours du plan + jours de repos** (carb-cycling, sous-ensemble des jours du plan — ajouté à l'onboarding 2026-06-20) **+ repas inclus** (DERNIÈRE étape, bouton « Générer mon plan » — depuis le 2026-08-07, une LISTE de créneaux avec leur heure, et un bouton **« Ajouter un repas »** : plus de plafond à 4, cf. le point « créneaux libres » plus bas). **L'étape « récap » a été SUPPRIMÉE 2026-06-20** (redondante avec le reveal) → le récap + le **disclaimer** vivent désormais dans le reveal du 1er plan ; le **rappel quotidien** vit UNIQUEMENT dans **Profil → Réglages** (`useReminder`, décision fondateur de ne pas le proposer ailleurs). **Repas fixes (« Je gère ») + emphase des repas RETIRÉS de l'onboarding 2026-06-20** (réglables dans Profil → Paramètres des repas ; l'onboarding pose `meal_emphasis:'even'`, `fixed_meals:undefined`). **Macros TOUJOURS calculées (auto) à l'onboarding** ; le fork « Calculées / Perso % » a été RETIRÉ de l'onboarding (2026-06-20, simplification activation North Star) → l'ajustement perso % vit désormais uniquement dans le **Profil → Calories & macros** (`macro_mode='auto'` posé au finish). **Découvrabilité perso macros (2026-07-03)** : comme le fork a quitté l'onboarding, un lien **« Ma répartition (%) »** sur la carte macros de l'écran Plan **deep-linke** vers l'éditeur (drapeau `@kyroz:openEditor='macros'` consommé au focus du Profil via `useFocusEffect`). Fix au passage : la ligne « Calories & macros » du Profil affiche « Perso % » / « Calculées » (avant : testait `macro_mode==='manual'`, jamais vrai → toujours « Calculées »). ⚠️ Jours du plan **décochés par défaut** (noir = off, blanc = on). Auto-génère le plan à l'arrivée. **Reveal du 1er plan (`components/FirstPlanReveal.tsx`, J1, 2026-06-20)** : à la TOUTE 1re génération (depuis l'onboarding), overlay scrollable « C'est prêt, {prénom} ! » qui révèle la semaine (objectif/kcal/jours + aperçu du jour 1 **EN ENTIER** — un `slice(0, 4)` y traînait, invisible tant que 4 était le maximum, et il coupait le dîner dès le 5ᵉ repas : l'aperçu montrait une journée qui n'était pas celle servie ; corrigé le 2026-08-07) **+ le disclaimer** (absorbé de l'étape récap supprimée ; le rappel quotidien n'y est PAS — uniquement dans Profil) AVANT la visite guidée du Plan ; affiché UNE seule fois (flag `@kyroz:firstPlanSeen`, backfillé dans `load()` pour les profils ayant déjà un plan → jamais montré aux existants). Coordonné avec le tour (l'effet du tour attend `!showReveal`).
- 🍽 **CRÉNEAUX DE REPAS LIBRES (2026-08-07, `lib/mealSlots.ts`)** — le plafond de 4 repas
  par jour est levé. Un créneau est une **donnée** (`MealSlot` : id, libellé, heure, vivier),
  plus une valeur de type : l'utilisateur crée « Shaker post-training », 18h30, vivier
  collation, à l'onboarding **et** dans Profil → Paramètres des repas, par le **même**
  composant (`components/MealSlotsPicker.tsx`).
  **Ce que ça corrige** : `MealType` était une union FERMÉE de 4 valeurs — le plafond
  n'était écrit dans aucune spec, **il était dans le TYPE**. Qui mange 6 fois par jour ne
  pouvait pas le déclarer, et le moteur répartissait son budget sur 4 assiettes qu'il ne
  mangeait pas : un plan faux, sans message.
  - **Non destructeur, et c'est le point de conception** : les 4 intégrés gardent leurs ids
    (`breakfast`/`lunch`/`dinner`/`snack`), donc `profiles.meals` (text[], sans contrainte
    d'énumération), les plans en cache, `fixed_meals` et les tags de recettes désignent
    toujours les mêmes créneaux. Ils restent **en dur côté app** ; seuls les créneaux CRÉÉS
    vont en base (`profiles.meal_slots` jsonb — **migration A31, PAS ENCORE JOUÉE**).
  - 🔴 **`MEAL_ORDER` est devenu CHRONOLOGIQUE** (collation 16 h avant dîner ; elle était
    servie en dernier) → **`ENGINE_VERSION` 46 → 47**, le plan de tout le monde se régénère
    une fois. Aucune calorie ne bouge. ⚠️ **`MEAL_DEFAULT_PRIORITY` reste, lui, non
    chronologique** : `syncGuard::normalizeMeals` lit « je veux N repas » et prend les N
    premiers — sur l'ordre du jour, N = 3 aurait **supprimé le dîner**.
  - **Plafond 8 repas/jour, MESURÉ** (`npm run mesure:creneaux`, 5 gabarits × 5 tirages ×
    7 jours) : écart calorique du jour 0,66 % à 4 · **0,92 % à 8** · 1,19 % à 9 · 4,94 % à 12 ;
    drapeaux vus par l'utilisateur 4 → **81** → 174 → 712. Dernier palier sous 1 %, dernier
    avant que les drapeaux ne DOUBLENT. Dégradation **graduelle et concentrée** : jusqu'à 8,
    74 des 81 drapeaux sont sur F 55 sèche **vegan** — la limite « petits formats vegan » déjà
    consignée ; à 9 ça déborde sur les petits gabarits omnivores (6 → 30).
    ℹ️ La mesure a trouvé un défaut **hors périmètre** : à **3** repas, H 95 en prise de masse
    est à 6,11 % d'écart et 41 drapeaux — le catalogue n'a pas de plat à 1 060 kcal. Antérieur
    aux créneaux libres (3 repas se choisissaient déjà). Noté, pas corrigé.
  - **Vérifié dans le navigateur** (worktree, port 8095) de bout en bout : création du créneau
    à l'onboarding → `meals: [breakfast, lunch, snack, custom-1, dinner]` + `meal_slots` en
    stockage → écran Plan qui sert **5 repas dans l'ordre du jour**, la carte affichant
    « SHAKER POST-TRAINING » et une recette de collation.
  - Garde-fou : `lib/__tests__/mealSlots.test.ts` (32 tests), **vérifié par 6 mutations**.
    ⚠️ La 6ᵉ a fait rougir le test… **au deuxième essai** : neutraliser tout le filtre de
    vivier laissait le premier vert, parce que sur une cible de collation le moteur choisit
    une collation même quand le catalogue entier lui est ouvert. Il mesure désormais le
    VIVIER (`mealPoolSize`), pas la sortie.
- **TDEE/macros** (`lib/tdee.ts`) : Katch-McArdle si %MG connu, sinon Mifflin (le retrait de Katch = P1.3, pas encore fait). Modes `auto` / `percent` (protéines g/kg réglables + `carb_ratio`) ; `manual` legacy. UI `MacroSplit`. `computePlan` = producteur unique (profil + drapeaux + plancher) ; `recalcProfile`/`planFlags` en sont les deux façades. Un nouveau poids met à jour profil+macros+plan.
- **⚠️ SÉCURITÉ DU MOTEUR — PR 1 / P0 livrée (2026-07-28, `lib/safety.ts`)** — spec d'origine ARCHIVÉE : `docs/archive/2026-07-29-moteur-v2-corrections.md` (⚠️ document d'histoire, 59 de ses 85 points divergent du code ; P2 n'est pas arbitré par lui).
  - ⚠️ **AUDIT ADVERSE DU P0 (2026-07-28) — 11 défauts trouvés, tous corrigés et verrouillés par tests.** Cinq angles : plancher & registre, synchro, maths de l'objectif daté, macros, appelants. **Les agents ont été tués par la limite de session à deux reprises ; ce qui a sauvé l'audit, c'est de leur faire écrire leurs trouvailles au fil de l'eau dans un fichier hors du repo — à refaire systématiquement.** Au-delà des deux ci-dessous : (3) le **registre ne se vidait jamais** — la restriction se jugeait sur une cible virtuelle, donc une fois l'escalade arrivée à la maintenance l'utilisatrice ne subissait plus aucun déficit mais sa semaine continuait de compter (verrouillée à déficit zéro à vie) → le plancher se calcule sur `lowEaWeeksBefore` et l'enregistrement juge la cible RÉELLEMENT SERVIE ; (4) le **mode « Perso % » annulait le correctif protéique P0.2** — l'UI pré-remplit toujours `protein_per_kg`, donc ce chemin est celui de TOUS ses utilisateurs, et il prenait le poids brut (F 90 kg : 135 g en auto contre 198 g, soit 3,81 g/kg de masse maigre) → base = masse maigre partout ; (5) le **plancher n'était pas rétroactif** — un profil dormant gardait sa cible d'avant la PR (1200 kcal servis pour un plancher réel de 1463) → `recalcProfile` appliqué au chargement dans `useProfile`, réécriture seulement si ça change ; (6) **`tdee = 0`** (valeur littérale d'un profil neuf, que les écrans passent telle quelle) annulait tout le déficit via `-Math.round(0.25*0) = -0` et déclarait l'objectif atteignable car `-0 === 0` ; (7) sous 7 jours restants le garde-fou de division déclarait « objectif ambitieux » un objectif sûr ; (8) **`low_ea_weeks` écrasé par une ligne cloud** antérieure à la migration → `reconcileCloudLowEaWeeks` (fusion par UNION, cf. syncGuard) ; (9) **InfoEditor validait encore l'âge contre 16** et n'appelait aucune éligibilité (on saisissait 18 puis 16), bornes de poids divergentes (40-250 contre 30-300) ; (10) **GoalEditor** laissait activer une sèche en insuffisance pondérale ; (11) mode manual : cliquet, `FLOOR_APPLIED` qui s'évaporait, trois drapeaux muets. **Mesuré, PAS des défauts** : `CARBS_BELOW_TRAINING_FLOOR` = 4/20 profils (discriminant) ; la baisse protéique du mode auto (16/20 profils) atterrit entre 1,86 et 2,60 g/kg de masse maigre — changement voulu.
  - ✅ **P0.5 + P0.6 (2026-07-28, après le merge du P0) — les deux points laissés ouverts sont TRANCHÉS et livrés.**
    - **P0.5 — le registre comptait des ENREGISTREMENTS, pas des semaines vécues.** Pesée hebdo → 26 semaines comptées, pesée mensuelle → 7, pour un comportement identique (~221 kcal/j de protection en moins pour la seconde) : un garde-fou qui récompense la négligence. Fix = champ **`since`** dans le registre (`LowEaRegistry { weeks, since }`) + **`settleLowEaExposure`** appelé AVANT le plancher, qui inscrit toutes les semaines ÉCOULÉES depuis le début de l'exposition — le plan servi reste en vigueur entre deux ouvertures de l'app. `since` retombe à `null` dès qu'un plan non restrictif est servi, donc **une vraie pause n'est jamais facturée**. Ordre imposé : *solder → plancher → servir → clore* (`markLowEaWeek`), et `lowEaWeeksBefore` continue d'exclure la semaine courante → idempotence préservée. Rattrapage borné à la fenêtre (52 semaines) contre un `since` aberrant. ⚠️ **AUCUNE migration** : la colonne est `jsonb`, on a fait évoluer la charge utile ; la forme legacy (tableau nu) reste LUE (`readLowEaRegistry`), plus jamais écrite. `lowEaWeeksForFloor` est le point d'entrée UNIQUE pour tout aperçu d'écran (sinon l'aperçu diverge de ce que `computePlan` enregistre).
    - **P0.6 — dérive sous IMC 18,5.** L'éligibilité garde les portes d'ENTRÉE, elle ne voit pas le temps passer : qui commence à IMC 19 et descend à 17,8 continuait de recevoir un déficit, et le plancher d'énergie **autorise** précisément la zone 30–35 — il n'existait donc **aucun mécanisme d'arrêt**. La faille la plus dangereuse du moteur, parce qu'elle ne se déclenchait que chez celles qui suivaient le plan le plus assidûment. Fix = `deficitBlocked(body)` (même prédicat que `checkEligibility`, source unique) évalué à CHAQUE calcul dans `floorAndFlags` : sous 18,5 le plancher monte à la **maintenance**, jamais au-dessus (on ne prescrit pas une prise de poids à qui a demandé une sèche — c'est son objectif à changer). Nouveau drapeau `UNDERWEIGHT_NO_DEFICIT` + `DatedGoalStatus.underweightBlocked` (l'objectif daté cesse de piloter la perte, la PRISE reste pilotée). ⚠️ **Piège d'interaction verrouillé par test** : l'objectif daté ramène la demande à 0 **avant** le plancher, qui n'a alors plus rien à refuser → sans requalification dans `computePlan`, poser un objectif daté faisait DISPARAÎTRE l'avertissement, précisément pour la personne qui poursuit activement une perte en insuffisance pondérale. Conditionné à un déficit **réellement demandé** : un objectif « maintien » à IMC 18 ne lève aucun drapeau parasite. Surfaces : carte en tête du profil (tapable → éditeur d'Objectif) + `DatedGoalCard`. L'éditeur d'objectif daté n'a PAS de branche dédiée — `goalBlockMsg` y refuse déjà toute cible en perte (vérifié : la branche serait morte).
  - ⚠️ **Deux limites mineures assumées** : le mode `manual` (legacy, non proposé par l'UI) garde un cliquet si le plancher baisse — l'écart va toujours vers « manger plus » ; et un utilisateur EXISTANT de 16-17 ans n'est pas expulsé de l'app, il est seulement bloqué à l'édition de son profil. C'est aussi pourquoi la contrainte `check (age >= 16)` de `schema.sql` n'a **pas** été resserrée à 18 : elle rejetterait leurs lignes à la prochaine écriture, et l'upsert du profil étant global, ils perdraient TOUTE synchro cloud en silence. Un filet de dernier recours ne doit pas casser ce qu'il attrape.

- ✅ **PR 3 — audit P2 (2026-07-29) : AUCUN des trois items ne part en développement.** 7 agents, mesures refaites sur le moteur réel. Workflow rejouable : `.claude/workflows/audit-p2-kyroz.js`.
  - **P2.1 (cyclage repos/sport) — REJETÉ.** Le moteur cycle DÉJÀ (`restDayRatio`, isocalorique) et lisse DÉJÀ la semaine (`DAILY_SMOOTH_CAP`). Surtout : le plancher est quotidien et additif, donc quand il mord il ne reste **aucun** degré de liberté à répartir. `ALPHA` et `MAX_DAY_RATIO = 1,35` sont **arithmétiquement incompatibles** avec lui (le ratio des planchers seuls vaut déjà 2,30 sur volume concentré) — aucune implémentation soignée ne les sauve. Et le « plancher lipidique 0,5 g/kg de poids » de la spec est la **4ᵉ tentative** de défaire ce que P0.2 puis P1.4 ont corrigé.
  - **P2.2 (calibration `k`) — REJETÉ comme correcteur, GARDÉ comme diagnostic.** `k` et `neat_level` achètent exactement la même grandeur : deux curseurs pour un seul réglage, dont un invisible qui bougerait le budget tous les 14 jours. Le CONSTAT est juste (le moteur ne mesure jamais son écart au réel) → à livrer en **lecture seule** dans Transformation (« tu perds 0,45 kg/sem, on tablait sur 0,30 »), jamais dans `computePlan`.
  - **P1.3 — reste reporté**, mais pour un motif refait (cf. ci-dessous).
  - 🔴 **Ce que l'audit a trouvé et qui n'était l'item de personne** — vérifié par mes propres mesures : (1) **« sèche » et « sèche rapide » servaient le MÊME plan** → fusionnés ; (2) **la question NEAT est un interrupteur de SÉCURITÉ** : passer de `desk` à `light` déplace le déficit de −167 à −300 kcal/j **et fait disparaître `FLOOR_APPLIED`**. Les libellés invitaient à la sur-déclaration → **réécrits en ancres vérifiables, cf. le bloc dédié ci-dessous** ; le préalable à un déplacement vers l'onboarding est donc levé (le déplacement lui-même reste une décision à part) ; (3) **4 `PlanFlag` sur 7 ne sont affichés nulle part** (`LOW_EA_WARNING`, `LOW_EA_BUDGET_EXCEEDED`, `MACRO_BUDGET_OVERFLOW`, `CARBS_BELOW_TRAINING_FLOOR`) — ⚠️ `LOW_EA_WARNING` est levé sur **quasiment toute sèche**, le câbler brut serait de l'alarme permanente : il lui faut un seuil, pas un fil.
- 📐 **BILAN — le brief d'origine du moteur confronté au code (2026-07-29). 18 agents, 85 points, tout mesuré en EXÉCUTANT le moteur.** Verdict : **59 des 85 points divergent du code**. Le brief (la spécification que le fondateur avait fait auditer, reproduite dans `KYROZ_MOTEUR_V2_CORRECTIONS.md`) **n'est plus une description du moteur, c'est un document d'histoire.** Ce n'est pas son échec : ses cinq questions ont été traitées, et c'est ce traitement qui a déplacé le code.
  - Répartition : **conforme 26 · divergence non décidée 21 · corrigé depuis 17 · brief obsolète 13 · jamais implémenté 8.** La catégorie qui compte est **« divergence non décidée » (21)** : ni voulue, ni documentée, apparue par accumulation de correctifs.
  - ⚠️ **Sur 7 constats classés CRITIQUE, 4 n'ont PAS survécu à la contre-expertise adverse** (chaque agent avait pour consigne de démolir son constat, pas de le confirmer). Démolis : « 42,1 % des gens qui suivent le plan sont classés en retard » (chiffre non reproductible, et **aucun écran n'écrit « en retard »**) · « 13,7 % suralimentés » (artefact de grille, **0,09 %** en population pondérée) · « énergie disponible effondrée dès 2×1 h 30 » (dépend de la TAILLE de séance, pas du volume : 3×60 donne 0 %) · « le plancher étouffe les gabarits lourds, 189 semaines » (**l'app annonce ces 189 semaines**, et l'étau serre les corps maigres lourds, pas les obèses). **Sans cette passe, quatre fausses alarmes partaient en chantier.**
  - ✅ **Les 3 constats qui TIENNENT** : (1) le **déficit servi n'est presque jamais celui demandé** — pire cas rejoué, un homme de 105 kg à 10 %MG reçoit −58 kcal/j ; cause réelle = **le NEAT par défaut à 1,20**, pas le chemin unique comme l'agent le croyait ; (2) **l'âge n'entre dans AUCUNE valeur servie** dès que le %MG est déclaré — vérifié deux fois, dont par moi : **288/288 corps, cibles identiques de 18 à 90 ans, écart 0 kcal** (Katch-McArdle n'a pas de terme d'âge, et le %MG est bloquant à l'onboarding, donc 100 % des comptes passent par cette branche) ; (3) **l'objectif daté repousse la date ~9 fois sur 10**, cas rejoués au jour près — mais l'échec est annoncé PENDANT la saisie, pas découvert après.
  - 🎯 **Le motif unique des cinq réponses : le moteur fait des choses justes et ne les dit pas.** Côté DANGEREUX il tient (0 macro à zéro, 0 cible sous le BMR, 0 déficit > 25 % sur 90 000 profils). Côté DÉCOURAGEANT, c'est là que tout se joue. Deux trous encore ouverts : le déficit rogné sans un mot d'explication en mode auto, et **le suivi de poids qui ne connaît que 2 des 4 raisons d'être en pause** — mesuré, 2 880 femmes sur 3 840 sorties de déficit ont un plan revenu au maintien et **0** sont marquées en pause, leur couloir continue de descendre.
  - 🔬 **Ce que le brief affirme et qui réintroduirait un bug si on le rejouait tel quel** : NEAT fixe 1,3 (le défaut servi est 1,20, écart médian +170 kcal/j) · MET **bruts** (le code les prend nets, `MET − 1`, sinon l'heure d'entraînement est facturée deux fois) · plancher 1500/1200 comme SEUL plancher (il y en a **cinq**, et l'énergie disponible gagne dans 80,3 % des cas ; 1500/1200 n'arrive que 3ᵉ) · 7 700 kcal/kg dans les deux sens (**5 000 en prise**) · rythme max 1 %/sem (remplacé par 0,5 / 0,75 / 1,25 selon l'adiposité — **0 occurrence de 1,0** sur 1 292 objectifs ; le rétablir serait une régression de sécurité chez les sujets minces) · protéines par `max(masse maigre × g/kg, poids × plancher)` (formule remplacée ; elle ne reproduit la valeur servie que sur **2,3 %** des profils) · zone ±1 kg fixe (proportionnelle au-delà de 66,6 kg).
  - 📄 **Détail complet non versionné** (85 points, 5 réponses, 7 verdicts) : page publiée le 2026-07-29 depuis la session, et sorties brutes des agents dans le journal du workflow. ⚠️ **Seuls les 7 constats critiques ont subi la contre-expertise** — les divergences mineures sont mesurées par un agent unique et non revérifiées. Ne pas les traiter comme des faits établis sans les rejouer.
- 🔧 **OUTILLAGE — index `graphify` régénéré, et son hook obligatoire retiré (2026-07-29).** L'index décrivait un moteur mort : il plaçait `MIN_KCAL` en `lib/tdee.ts:6` (le symbole vit en `lib/safety.ts:116`), exposait une fonction `activityMultiplier()` **supprimée par P1.1**, et `graphify explain "computePlan"` répondait *No node matching* — sur la fonction centrale du moteur. Régénéré par `graphify update . --force` depuis `kyroz-app/` (878 nœuds, 2556 arêtes, aucun LLM requis ; le `--force` est prévu pour les refactors qui suppriment du code). Vérifié après coup : `computePlan()` → `lib/tdee.ts:566`, `MIN_KCAL` → `lib/safety.ts:116`, `activityMultiplier` absent.
  - ✅ **Les deux hooks `PreToolUse` sont RETIRÉS** (`c588093`, `.claude/settings.json` = `{}`). Ils imposaient « MANDATORY: run graphify before reading source files ». **Le problème n'était pas l'outil, c'était l'obligation** : elle plaçait une source indexée — donc datée — DEVANT la lecture du code, qui est toujours exacte. Sur ce dépôt (~40 fichiers dans `lib/`), `grep -rn` est plus rapide et ne périme jamais. Mesuré sur la session du 2026-07-29 : trois appels `graphify`, **zéro orientation utile**, et l'index a menti trois fois. Effet immédiat, pas au redémarrage de session (vérifié).
  - 🔒 **Retiré par le fondateur, pas par l'agent** : le classifier de permissions bloque toute écriture dans `.claude/settings.json` — Write, Edit, Bash, et même un `git diff` nommant le chemin. C'est le bon comportement (un changement de configuration d'agent se tranche côté humain) ; ne pas chercher à le contourner. Le `git add` + `commit` du fichier, eux, passent.
  - **Règle générale qui en sort** : un index de code est un CACHE. Le régénérer fait partie de la maintenance, et aucun outil ne doit être rendu obligatoire AVANT la source qu'il indexe. Même motif que le plan de corrections et le backlog, qui ont menti le même jour.
- ✅ **Sortie de déficit expliquée + 3 drapeaux laissés MUETS volontairement (2026-07-29).** L'audit demandait « câbler les 4 drapeaux muets avec un seuil ». Mesuré sur **10 080 profils**, la conclusion est l'inverse : **un seul des quatre méritait d'être dit, et ce n'était pas celui qu'on croyait.**
  - 🔴 **Le défaut trouvé : la sortie de déficit était SILENCIEUSE.** Simulé semaine par semaine sur une femme de 62 kg, 26 %MG, 4 séances, en sèche : à partir de la **semaine 14**, sa cible monte de **23 kcal/j chaque semaine, dix semaines de suite, +230 kcal/j au total** — et aucun écran ne disait un mot. Une sèche dont les calories augmentent toutes les semaines se lit comme une app qui déraille. **Même classe que P3.3 (« le TDEE saute tout seul »), classé 🔴** — sauf que celui-ci n'est pas un accident de synchronisation : il est **garanti par construction** pour toute femme restant en zone basse > 12 semaines. L'homme témoin ne bouge pas d'un kcal (seul le plancher féminin remonte).
  - **Livré** : `safety::lowEaEscalation` (pur) → `ComputedPlan.low_ea_escalation` → carte `LowEaRiseCard` dans Profil. **Deux états**, parce que la remontée est bornée (30 → 35 kcal/kg, dix crans) : pendant, on annonce le rythme ET la fin ; au plafond, dire « ta cible remonte » serait faux → « Kyroz a mis ta sèche en pause » + action pour changer d'objectif. Ton anti charge mentale, comme la carte d'insuffisance pondérale.
  - ⚠️ **Le chiffre annoncé est calculé sur SA masse maigre** (`0,5 kcal/kg × masse maigre`), jamais une constante d'écran : 23 kcal/j pour 46 kg de masse maigre, 33 pour 66 kg. La maquette validée disait « environ 25 kcal » — **un test refuse cette valeur en dur** (vérifié : la remettre fait rougir 2 tests). Un écran d'explication qui annonce le mauvais nombre est pire que pas d'écran.
  - 🚫 **Les trois autres restent muets, sur mesure et non par principe** (tableau de fréquences dans `types.ts`, au-dessus de `PlanFlag`) : **`LOW_EA_WARNING`** se lève sur **80,4 % des sèches** mais l'énergie disponible servie n'est **JAMAIS sous 30** (le plancher garantit le seuil IOC) → il ne signale que « tu es en zone 30–35 », où le moteur protège déjà et où l'utilisateur n'a aucun levier ; il reste utile EN INTERNE (il alimente le registre). **`CARBS_BELOW_TRAINING_FLOOR`** : 27,4 % des sèches, manque médian 30 g, aucun levier en mode auto → **décision fondateur : muet**. **`MACRO_BUDGET_OVERFLOW`** : **0 sur 10 080** — canari d'ingénierie, pas un message ; s'il se lève un jour c'est un bug à corriger.
  - **Règle qui en sort** : avant de câbler un drapeau, **MESURER sa fréquence**. Un drapeau qui se lève sur un quart de la population sans levier n'est pas de l'information, c'est de l'inquiétude.
- ✅ **Libellés NEAT réécrits en ancres vérifiables (2026-07-29).** Mesuré sur 800 profils : **un cran = 126 à 165 kcal/j de maintenance** (médiane 142), et surtout, en sèche, **le plancher de sécurité n'est contraignant qu'au cran `desk`** — 200/200 des profils y sont retenus par lui (déficit servi −180 au lieu des −300 demandés), **0/200 dès `light`**. Un seul clic vers le haut supprime le garde-fou pour la totalité des profils. ⚠️ **Piège de lecture** : sur un profil déjà retenu par le plancher, ce clic ne déplace la CIBLE que de ~15 kcal — ce qui double, c'est le DÉFICIT (−167 → −300). Ne pas conclure « faible impact » d'un petit écart de cible.
  - **Le bug était dans l'indication, pas dans le ton** : le cran 2 s'annonçait « Bureau avec déplacements, **courses, ménage** ». Les courses et le ménage, c'est tout le monde — le texte invitait littéralement un employé de bureau à monter d'un cran. La mention est désormais **rattachée au cran 1** (« Les courses et le ménage ne changent rien : c'est ici »), où elle coupe l'inflation au lieu de la nourrir. Verrouillé par test (comparaison par **mot entier** : « déménagement » contient « ménage », et le cran 4 a le droit de citer les déménageurs).
  - **Ancrage retenu : le métier / la posture de la journée**, pas le nombre de pas — un compteur de pas inclut les séances de course (~6 000 pas pour une seule), soit exactement le double-comptage sport/NEAT que `NEAT_PAL` existe pour éviter. Décision fondateur.
  - **Ce qu'on ne fait PAS** : afficher les kcal sous chaque option. Ça transformerait une question factuelle (« c'est quoi tes journées ? ») en choix de résultat (« je prends lequel pour manger plus ? »).
  - `NEAT_SHORT` ajouté pour la ligne de résumé du profil (`numberOfLines={1}`) : la première version à 32 caractères s'affichait « journées assises, en dépl… », **vu à l'écran**. Budget mesuré à 375 pt : ~36 caractères préfixe compris.
- ✅ **Fusion des deux sèches + énergie disponible HEBDOMADAIRE (2026-07-29).** `cut_aggressive` retiré des deux écrans et normalisé au chargement (`syncGuard::normalizeGoal`) — mesuré sur 2268 profils : **0 % d'écart** avec `cut` dès que le %MG est déclaré, 1 à 16 kcal/j quand il est estimé (du bruit). Conservé dans le type et `GOAL_CONFIG` : une ligne cloud non encore normalisée doit rester calculable. `'Sèche progressive'` → `'Sèche'`. **La vitesse se pilote désormais par l'objectif daté**, seul mécanisme qui sache dire si un rythme est tenable (P1.6) ; une carte le dit dans l'éditeur d'objectif.
  - ⚠️ **L'argument « 0 % d'écart » est MORT depuis le relèvement NEAT du 2026-07-31**
    (A7). En décollant la cible du plancher, il a rendu la parole aux deltas de
    `GOAL_CONFIG`. Remesuré sur 2 160 profils, tous crans NEAT confondus : écart
    médian **134 kcal/j** (p25 36 · p75 200), soit **67 % des 200 kcal nominaux** ;
    le choix n'est encore fantôme que pour **19 %** des profils, contre 100 % avant.
    Le test `fusion-seches.test.ts` avait prévu ce jour-là et disait « alors la
    question de rouvrir un objectif rapide se repose légitimement ».
  - ✅ **ARBITRÉ le 2026-07-31 : on NE rouvre PAS de « sèche rapide ».** Le motif a
    changé, la décision tient — et pour une raison mesurée, pas par inertie :
    **l'objectif daté sert DÉJÀ exactement le même déficit**, au kcal près.

    | profil | sèche | rapide | **objectif daté** |
    |---|---|---|---|
    | H 90 kg · 25 %MG · 3× | −300 | −351 | **−351** |
    | F 75 kg · 32 %MG · 4× | −300 | −384 | **−384** |
    | H 110 kg · 35 %MG · 0× | −300 | −343 | **−343** |

    Les deux butent sur le même plancher. Un « rapide » n'ouvrirait donc **aucune
    porte** que l'objectif daté n'ouvre pas, et le ferait moins bien : il ne rend
    aucun retour (l'objectif daté annonce une date et refuse un rythme intenable) ;
    il promettrait 200 kcal et en servirait 134, le plancher mordant sur **71 %** des
    profils « rapide » contre 19 % en « sèche » — soit exactement le mensonge qu'on
    vient de retirer, déplacé d'un cran ; et il donnerait une version gratuite et
    dégradée de la valeur Kyroz+ (« piloter son objectif dans le temps »).
    **Ne pas re-proposer sans mesure nouvelle.** Le seul chantier qui reste sur ce
    sujet est RÉDACTIONNEL : que « Sèche » dise qu'on peut aller plus vite via
    l'objectif daté, plutôt que de laisser croire qu'il n'y a qu'un rythme.
  - **Décision fondateur : l'EA est une moyenne HEBDOMADAIRE, pas une contrainte quotidienne.** `safety.ts` disait « plancher RÉEL de la journée » — c'était faux, la dépense sportive est lissée (semaine/7). Mesuré sur 378 profils par volume : **94 à 98 %** des profils sportifs sont sous EA 30 le jour de leur séance (moyenne 24,8–28,7, min 23,4) et **aucun sous 20**. Le risque RED-S est chronique, pas journalier. ⚠️ **Ce que ce choix NE couvre PAS** : le volume CONCENTRÉ (`course 1×120` → 100 % sous EA 20, moyenne 8,1 ; **négatif** à 1×180). Ce n'est pas au plancher de le rattraper (il ne sait pas quel jour porte quelle séance) → **contrôle de plausibilité à la saisie, non fait à ce jour**.
  - `isTrainingDay` : défaut **dérivé des séances déclarées** au lieu de `true`. Il levait `CARBS_BELOW_TRAINING_FLOOR` sur des profils à ZÉRO séance (H 70 kg sédentaire : 189 g pour un seuil à 210 g). Inoffensif tant que le drapeau n'est affiché nulle part — **prérequis absolu avant de le câbler**.
- ✅ **PR 2 — P1 (2026-07-28), étapes 1 et 2 livrées.** Validé par 15 agents AVANT implémentation (6 verdicts + 6 contre-expertises adverses + cohérence docs↔code + impact sur 12 profils). **La spec P1 avait tort trois fois** — d'où l'ordre de livraison, qui est celui de l'audit et pas celui du document : affichage d'abord (zéro kcal déplacé), budget constant ensuite, déplacement du TDEE en dernier.
  - **P1.6 — projection au rythme SERVI** (`datedGoalStatus`, 5ᵉ paramètre `floorKcal` **obligatoire**, `floorCapped` + `projectable`). Mesuré avant correctif sur 1344 objectifs : écart médian **32 jours** entre la date annoncée et la date réelle, 89 au p90, **724 au pire**, et **655 objectifs annoncés « atteignable » à tort**. Cas type, cœur de cible : H 35 ans / 90 kg / sédentaire, annoncé « 0,5 kg/sem, 13 oct. 2026 », réel **0,2 kg/sem, mars 2027**. Ce ne sont PAS les sportives : ce sont les hommes sédentaires, dont le plancher (BMR) frôle la maintenance. Paramètre non optionnel **à dessein** : quand il l'était, `DatedGoalCard` compilait sans lui et continuait de mentir. **Trois gardes** : rythme nul (`-0` passait), rythme INVERSÉ (plancher > maintenance → surplus prescrit, `diff/applied` redevient positif et la date paraît crédible), horizon > 5 ans (0,04 kg/sem projette poliment 2048). Mode `manual` neutralisé (`null`) : la cible y vient des grammes, la formule y donne le signe inverse. **Display-only : aucune calorie servie ne bouge**, verrouillé par test.
  - **P1.5 — zone PROPORTIONNELLE** (`zoneHalfWidthKg` = `max(1,0 ; 1,5 % du poids)`), couloir effilé dans `WeightChart`. ⚠️ **La justification écrite ici était À L'ENVERS — corrigée le 2026-07-29.** Elle disait « la personne dont le bruit de balance pèse le plus lourd était jugée le plus strictement », en citant les nombres qui la contredisent : ±1 kg fixe valait 2 % du poids à 50 kg contre 0,8 % à 120 — donc en RELATIF c'est le gabarit **LOURD** qui était jugé le plus strictement. Mesuré : la demi-largeur reste **plate à 1,000 kg jusqu'à 66,6 kg** puis suit 1,5 % ; la personne légère garde donc **exactement** l'ancienne tolérance (2,22 % de son poids à 45 kg). **Le correctif est bon, son motif était faux** : il n'a pas élargi la zone des légers, il a arrêté de resserrer celle des lourds (0,83 % → 1,50 % à 120 kg, écart relatif divisé par 1,8). **La trajectoire exponentielle de la spec est REJETÉE** — la formule (`tau = D/2,5`) est TOUJOURS sous la linéaire en sèche, elle exigeait **2,72× le rythme au démarrage** : elle faisait l'inverse de ce qu'elle prétendait. Et sa prémisse est fausse ici (les calories sont re-visées à chaque pesée, la ligne est auto-correctrice). ➕ **Trou trouvé au passage** : sous P0.6 le plan est bloqué au maintien, donc le poids ne PEUT plus descendre — mais `idealWeightAt` continuait, et on affichait « en retard, +5 kg » à quelqu'un à qui l'app venait d'interdire tout déficit. → `TrackState` gagne `'paused'`.
  - **P1.4 — plancher lipidique 0,8 g/kg de MASSE MAIGRE** (`fatTargetG`), borné par le budget. La spec proposait 0,5 g/kg de **poids de corps** : c'était refaire à l'identique l'erreur que P0.2 venait de corriger sur les protéines (jusqu'à **42,6 % des kcal en lipides** chez les profils à masse grasse élevée). ⚠️ **Le trou n'était pas où la spec le plaçait** : le mode auto va déjà bien (le plancher P0 a relevé les cibles), c'est le mode « **Perso %** » qui servait 12 à 20 g de lipides — **6,6 % des calories** — sur des profils ordinaires. Corrigé sur trois fronts car un seul n'aurait rien migré : curseur **90 → 75**, plancher moteur, et **clamp de `carb_ratio` À LA LECTURE** (il est PERSISTÉ et synchronisé ; `carb_ratio = 100`, que la base acceptait, servait **0 g de lipides sans le moindre drapeau**). Les glucides deviennent le **reliquat** en mode percent — relever les lipides sans les recalculer faisait déborder le budget de +13,5 %.
  - **Plafond de déficit 25 % étendu à TOUS les chemins** (décision fondateur). `CLAUDE.md` §6 le range parmi les hard blocks mais il n'existait que sur l'objectif daté : mesuré en exécutant le moteur, F 55 ans / 60 kg / 4 séances en « sèche rapide » recevait **28 % de déficit sans aucun drapeau**. C'est un plancher calorique de plus (75 % du TDEE), il ne peut pas créer de surplus.
  - **P1.3 (retrait de Katch-McArdle) SORTI DE P1** (décision fondateur). Le diagnostic de la spec est juste — Katch-McArdle ignore l'âge et la taille, saut de +231 kcal à la bascule. Risque **bidirectionnel**, que ni la spec ni le premier auditeur ne voyaient : sous le point de bascule (~21 % chez H, ~33 % chez F) il écrase le déficit contre le plancher P0.1, au-dessus il desserre l'escalade P0.5/P0.6.
    - ⚠️ **LE MOTIF DE REPORT ÉCRIT ICI ÉTAIT PÉRIMÉ — corrigé le 2026-07-29.** Il affirmait que le retrait « rouvre un déficit de −84 kcal/j à la femme ramenée à la maintenance » et « fait passer au ROUGE le test *le registre se VIDE* ». Les deux ont été **re-mesurés sur le moteur d'aujourd'hui, par deux agents indépendants** : le test reste **VERT** et le −84 kcal/j ne se reproduit pas. Ces chiffres dataient du moteur d'AVANT l'étape 3 (MET bruts, double chemin TDEE). ⚠️ **Leçon générale : un motif de report doit être REDATÉ quand le moteur bouge sous lui**, sinon la décision suivante se prend sur une mesure morte.
    - **Le vrai motif, mesuré le 2026-07-29** : retirer Katch fait manger **87 kcal/j de MOINS** au profil sec (2550 → 2463) **tout en supprimant son déficit** (−131 → 0). Le pire des deux mondes, et précisément sur le cœur de cible. La porte de sortie « borner Katch à ±10 % de Mifflin » est pire encore : le clamp est bilatéral, il tire le BMR du jeune homme lourd et sec vers le BAS pendant que le plancher ne bouge pas → **5,4 % du cœur de cible passe à déficit zéro**, contre 0 % aujourd'hui. **Ne pas la proposer.**
    - **Condition pour que P1.3 devienne livrable** : avoir tranché ce que doit valoir le déficit servi quand le plancher mord. C'est le « design propre de l'interaction plancher/BMR » que le report exigeait, et il n'est toujours pas fait.
  - 📄 **Mesures de l'audit ARCHIVÉES dans `docs/archive/2026-07-28-audit-p1-mesures.md`** — tableaux NEAT, panel d'impact sur 12 profils, amplitudes chiffrées. Obtenues en EXÉCUTANT le moteur, pas en le relisant. L'étape 3 qu'elles arbitraient est **livrée** : à lire comme une trace, pas comme un reste-à-faire.
  - ✅ **Étape 3 livrée (2026-07-28) — déplacement du TDEE.** 523 tests verts.
    - **P1.2 — MET NET (`MET − 1`)** (`lib/sport.ts::RESTING_MET`). `BMR × NEAT` couvre déjà les 24 h, séance comprise : créditer le MET brut facturait deux fois l'heure d'entraînement. Retiré **SEUL**, comme décidé — ni muscu à 4,0 (valeur d'aucune ligne du Compendium, traiterait une 2ᵉ fois le même phénomène), ni facteur 60+ (2,7/3,5 = 0,771 ≠ 0,85, falaise à l'anniversaire), bornes de séance 15–180 conservées. Amplitude : `0,0175 × poids × min` par séance, soit **−38 à −58 kcal/j**. ➕ Bénéfice non anticipé : la dépense nette EST la définition de l'EEE du calcul RED-S — la marge d'EA au plancher passe de **30,7–30,8 à 30,00 exact**, elle était partiellement fictive.
    - **P1.1 — CHEMIN TDEE UNIQUE** : `calculateTDEE(profile)` = `BMR × NEAT + dépense sportive`, **une seule formule pour tout le monde**. `training_days_per_week` ne pilote plus le TDEE (il reste utile aux jours de repos / au plan). Supprime la marche d'escalier mesurée : déclarer **1 séance de 15 min de marche** faisait bondir le TDEE de **+116 à +245 kcal/j** (médiane +181, **positif dans 100 % des 360 profils**) ; la méthode legacy avait en plus ses propres marches (+311 kcal entre 2 et 3 séances). Le saut vaut désormais < 15 kcal, verrouillé par test. Signature changée en objet (`TdeeBody`) : les 7 paramètres positionnels invitaient à l'erreur.
    - **NEAT paramétrable** (`NEAT_PAL` = **1,20 / 1,28 / 1,36 / 1,45** à l'époque ; ⚠️ **relevé à 1,30 / 1,35 / 1,40 / 1,45 le 2026-07-31, cf. A7** — le paragraphe qui suit décrit l'état de juillet et son raisonnement, pas la table courante), `neat_level` : `desk|light|active|physical`). Question dans le profil (éditeur renommé **« Sport & activité »**, NEAT AVANT les séances pour ne pas inviter à compter l'entraînement deux fois) — **pas à l'onboarding**, comme décidé. ⚠️ **Le défaut EST la valeur servie** pour la quasi-totalité des profils : `desk = 1,20` (à l'époque), parce que **l'erreur n'est pas symétrique** — sur-estimer fait manger à sa maintenance en croyant sécher (échec SILENCIEUX, 61 à 87 % du déficit effacé à 1,35), sous-estimer fait perdre un peu plus vite (VISIBLE sur la balance, et **borné par le plancher, qui ne dépend pas du NEAT** : l'EA se mesure hors NEAT, verrouillé par test).
    - **`engine_rev` + `engine_notice`** (`lib/tdee.ts`, migration `2026-07-28_profiles_neat_engine_rev.sql`) : au premier recalcul sous une nouvelle révision, si la cible SERVIE bouge de ≥ 100 kcal/j, on dépose un avertissement affiché **une fois** en tête du profil (« Régler mon activité » → l'éditeur / « C'est noté »). ⚠️ **Deux pièges verrouillés par test** : (1) l'avertissement déposé ne doit PAS être recalculé aux passages suivants — le profil est recalculé à chaque ouverture d'app et dès le 2ᵉ passage l'écart vaut 0, le message se serait effacé avant d'être lu ; (2) la clé doit être **retirée** et pas mise à `undefined` — `JSON.stringify` élide les `undefined`, `useProfile` n'aurait vu aucun changement à persister et le message serait revenu.
    - 📉 **Conséquence produit à assumer** : le TDEE baisse (−230 kcal/j mesuré sur un profil muscu 4×60), donc **le plancher de sécurité mord bien plus souvent** — le déficit servi en sèche tombe de 300 à ~150-260 kcal/j chez les profils entraînés (C : 300 → 151). Les objectifs datés afficheront plus souvent « cette date n'est pas tenable » (P1.6). C'est honnête, pas cassé : le levier côté utilisateur est **de répondre à la question NEAT**, ce que la carte one-shot propose explicitement.
    - **Filet de synchro ajouté** : `pushProfile` retente l'upsert SANS les colonnes de la dernière migration si Postgres le rejette (PGRST204) → « synchro morte en silence » devient « tout passe sauf ces champs ». `reconcileCloudNeat` protège `neat_level` d'une ligne cloud antérieure à la migration (perdre le niveau = jusqu'à −450 kcal/j de TDEE).
    - ⏭️ **Hors périmètre, inchangé** : **P1.1(c)** (décroissance des séances non loggées — aucun journal d'entraînement n'existe) et le **champ de provenance %MG** sont des FEATURES ; **P1.3** reste en P2.

- ✅ **Cohérence docs↔code (2026-07-28) — 24 divergences, dont 5 qui partaient en production.** ⚠️ **L'âge minimum disait encore 16 ans dans les documents CONTRACTUELS et RÉGLEMENTAIRES** : `constants/legal.ts` + `public/legal.html` (**CGU publiées** — « réservé aux 16 ans et plus », en ligne, contredisant le code), `RGPD-REGISTRE.md` (registre de traitement), et **`STORE-RELEASE.md` en TROIS endroits** dont la note reviewer en anglais collée dans App Store Connect — elles auraient été **soumises fausses** à Apple et Google. Tout corrigé. ➕ `supabase/schema.sql` ne contenait **ni `low_ea_weeks` ni `hidden_recipes`** alors que `PROFILE_COLS` les synchronise (les 32 colonnes ont été diffées : ce sont les deux seules). ➕ Le snippet `safetyFloorKcal` de la spec était la version **d'avant** le correctif (4 paramètres, sans le plafonnement à la maintenance) — le ré-implémenter depuis la doc réintroduisait le surplus forcé.
  - 🐛 **BUG VIVANT EN PRODUCTION trouvé au passage** : `schema.sql` bornait `body_fat_pct` à **3–60** alors que `bodyFatBounds` autorise **12–65 chez la femme** et que `BodyFatPicker` lit ces bornes. Une femme qui saisit 61-65 % voyait son upsert rejeté — et comme `profileToRow` écrit toutes les colonnes en un seul upsert, ce n'est pas le champ qui était perdu mais **le profil entier** : push en échec, profil « dirty », synchro cloud morte en silence. Migration `2026-07-28_profiles_body_fat_bounds.sql` (on ÉLARGIT, jamais on ne resserre : une contrainte élargie n'a par construction aucun effet sur les lignes existantes).
  - ⚠️ **`graphify-out/graph.json` est PÉRIMÉ** (13/06/2026) : il n'indexe **aucun** fichier du moteur — `lib/safety.ts`, `lib/datedGoal.ts`, `lib/sport.ts` n'existaient pas encore, et il place `calculateTDEE()` en L45 alors qu'elle est en L74. Le CLI ne propose pas de commande de regénération (`install`/`path`/`explain`/`diagnose` seulement). Inutilisable pour auditer le moteur tant qu'il n'est pas reconstruit.
  - ⚠️ **Les deux premiers défauts (2026-07-28) — corrigés, verrouillés par tests.** (1) **Le garde-fou se retournait en SURPLUS FORCÉ** : une semaine était comptée dès que l'EA passait sous 35, *sans vérifier qu'il y avait un déficit*. Or beaucoup de gens sont naturellement sous 35 à leur maintenance (F 125 kg / 36 %MG sédentaire → EA 31,5) : elle accumulait des semaines sans faire de régime, et à s16 le plancher escaladé dépassait son TDEE de +282 kcal/j, soit ~1,3 kg de prise par mois **prescrits par le mécanisme de sécurité**. Compteur jamais libéré (zone jugée sur un plan structurellement sous 35). Fix en deux temps : `countsAsLowEaWeek` exige un DÉFICIT, et `safetyFloorKcal` prend le TDEE et **plafonne la composante EA à la maintenance** — invariant : un plancher empêche un déficit excessif, il n'impose jamais un surplus. L'escalade converge désormais vers le TDEE et s'y arrête (sortie de déficit, pas prise de poids). (2) **`checkEligibility` n'était appelée qu'à l'onboarding** : l'éditeur d'objectif daté laissait viser 40 kg pour 1 m 80 (IMC 12,3). Désormais interrogé, motif affiché, enregistrement désactivé.
  - **Plancher d'énergie disponible (P0.1)** : `safetyFloorKcal = max(BMR, min(30 kcal/kg de masse maigre + kcal sport/jour, TDEE), 1500 H / 1200 F)`. Le 1500/1200 n'est plus le plancher principal, juste le **filet** pour les gabarits extrêmes. **Aucun chemin de code ne le contourne, mode `manual` compris.** ⚠️ Le seuil EA est **30 pour les deux sexes** — la v1 de la spec disait 35 pour les femmes, c'était une erreur de nature (35 = fonction optimale, pas seuil de risque) qui laissait 144 kcal/j de déficit à une femme de 65 kg, soit du maintien déguisé. La zone 30–35 est autorisée mais **budgétée à 12 semaines cumulées sur 12 mois glissants** (`low_ea_weeks` = `{ weeks: lundis[], since }`, pas un entier — cf. P0.5) : au-delà, le plancher remonte de 0,5/semaine vers 35 chez la femme non ménopausée. ⚠️ **Piège verrouillé par test** : l'appartenance à la zone se décide sur le plan NON escaladé, sinon le plancher dépend du compteur qui dépend du plancher → perte d'idempotence.
  - **Protéines (P0.2)** : `proteinTarget` = **poids ajusté** (`FFM + 0,25 × masse grasse`) × coef, clampé **[1,6 ; 2,6] g/kg de masse maigre**. L'ancien `max(masse_maigre × coef, poids × plancher_corps)` faisait l'inverse de ce que son commentaire annonçait : F 90 kg / 45 %MG recevait 180 g = 3,6 g/kg FFM. Effet de bord acquis : les glucides ne peuvent **mathématiquement** plus tomber à 0 au plancher. Le mode `percent` sans réglage explicite retombe sur la même valeur (plus de divergence auto/percent).
  - **Déficit (P0.3)** : plafond de rythme **modulé par l'adiposité** (`maxWeeklyLossPct` : 0,5 / 0,75 / 1,25 %/sem) **+ plafond dur à 25 % du TDEE**. Coût du kg **asymétrique** : 7700 en perte, **5000 en prise** (tissu mixte). `GOAL_DIRECTION_MISMATCH` si le poids cible contredit l'objectif → delta 0, pas de bascule silencieuse. Garde-fou `Math.max(1, weeksRemaining)` contre l'explosion à J-2.
  - **Éligibilité (P0.4)** : `checkEligibility` (mineur / grossesse / IMC de départ / IMC cible / volume > 20 h). ⚠️ Elle garde les portes d'ENTRÉE **uniquement** — la dérive dans le temps relève de `deficitBlocked` côté moteur (P0.6), les deux partageant le même prédicat pour ne pas pouvoir diverger. ⚠️ **Âge minimum relevé 16 → 18 ans** (CLAUDE.md §6 mis à jour) : Mifflin n'est pas validée sous 19 ans + conformité stores. Bornes de %MG désormais **sexuées** (`bodyFatBounds` : H 5–60, F 12–65 — 3 % était impossible chez une femme). Grossesse/allaitement **non dupliqué** : déjà bloqué par le portail `lib/healthScreening.ts`. Borne haute d'IMC cible **assouplie vs la spec** : ne bloque que si la cible fait MONTER au-dessus de 30 (sinon on bloquait la personne à IMC 40 visant IMC 32).
  - **%MG manquant** : estimé par **Deurenberg 1991** (`resolvedBodyFatPct`) — le plancher et la base protéique ne peuvent pas être optionnels. Sert à borner, jamais à afficher un %MG à l'utilisateur.
  - ✅ **MIGRATION SUPABASE EXÉCUTÉE (2026-07-28)** : `supabase/migrations/2026-07-28_profiles_energy_availability.sql` — **une seule colonne, `low_ea_weeks` (jsonb)**. P0.5 a fait évoluer la charge utile de cette même colonne **sans nouvelle migration** (c'est tout l'intérêt du `jsonb` : zéro couplage app/schéma, donc zéro risque PGRST204 à la mise en ligne).
  - **Ménopause laissée de côté (décision fondateur 2026-07-28)** : `is_post_menopausal` existe en TypeScript et le moteur le lit, mais il est **INERTE et LOCAL-ONLY** — aucune UI ne le pose, il est **hors `PROFILE_COLS`**, donc **aucune colonne Supabase** (même parti pris que `Streak.freeze_available`). Conséquence assumée : toutes les femmes sont traitées comme non ménopausées, soit le défaut protecteur. Pour l'activer plus tard : rédiger la question d'onboarding, ajouter la colonne dans une migration dédiée + la ligne dans `PROFILE_COLS` — le calcul n'a pas à bouger. Tests : `lib/__tests__/safety.test.ts` (42).
- **TDEE — chemin UNIQUE** (`lib/tdee.ts::calculateTDEE`, depuis l'étape 3 du 2026-07-28) : `BMR × NEAT + dépense sportive/jour`, quel que soit le profil. Plus de sélection de méthode selon que `sports` est rempli (c'est ce qui produisait la marche d'escalier de +181 kcal médians). BMR = Katch-McArdle si `%MG` connu, sinon Mifflin-St Jeor. **NEAT** = vie quotidienne HORS sport (`neat_level` → `NEAT_PAL` 1,20/1,28/1,36/1,45 ; défaut `desk` = 1,20 ; question dans Profil → « Sport & activité »). **Dépense sport (MET NETS)** (`lib/sport.ts`, `SportsEditor.tsx`) : table MET ~10 sports, `(MET−1)×3,5×poids/200×min×séances` — le `−1` retire le repos déjà compté dans `BMR × NEAT`. Colonnes jsonb/text : `sports` (migration `profiles_sports.sql`), `neat_level` + `engine_rev` + `engine_notice` (migration `2026-07-28_profiles_neat_engine_rev.sql`).
- **Moteur** (`lib/planEngine.ts`, `lib/adaptRecipe.ts`) — **refondu (ENGINE_VERSION 6) : scaling PAR INGRÉDIENT** (`adaptRecipe`) au lieu d'une grille de portions globale. `adaptRecipe(recipe, target)` reçoit une **cible EN GRAMMES** `{kcalMeal, proteinMeal, carbMeal, fatMeal}` et ajuste les quantités des ingrédients **scalables** (protéine = ancre + **plancher sur la protéine TOTALE du repas = `max(cible, protéine de la recette de base)`** : ancres `kp≥1` puis récupération §3.5 → **jamais sous la base, y compris** quand un fill porteur de protéine — lait/flocons/yaourt — a été rogné pour viser les glucides, cf. fix 2026-06-17 sur porridge multi-source ; `carb`/`fruit`/`dairy` et `fat` visés en **grammes** via `scaleToMacro` ; **légumes/aromates fixes**), recalcule les macros depuis les grammes (source de vérité) et renvoie des **`flags`** de faisabilité (`protein_below_target`/`over`/`under_target_kcal`/`fat_below_target`/`carbs_below_target`/`no_protein_anchor`). **« Un seul cerveau macro » = le moteur** : `adaptRecipe` ne calcule AUCUNE cible (pas de TDEE, pas d'`objective_profiles`). Le moteur (`carbFatRatio` + `mealTarget`) répartit les cibles du profil sur les repas : protéines pleines, **glucides/lipides déduits des kcal NON protéiques restantes × ratio carb:fat du profil** → un **écart hors-plan en kcal est ABSORBÉ** par le recalage (le ratio sert à reconvertir un budget kcal en grammes ; budget kcal+protéines reporté de repas en repas). **Sélection** = score de fit (flags + écart kcal, **ASYMÉTRIQUE selon l'objectif — `fitScore` pénalise ~2× le débordement kcal en sèche / le manque en prise de masse, via `goalDirection` ; A2 2026-06-18**) puis départage : **protéines préférées → soft-matching objectif/sport (`needMatch`) → fibres/variété → seed** (l'étape « recette jour off » a sauté le 2026-07-29, cf. D22). **Carb-cycling (v5 ; choix manuel 2026-06-19)** : jours de repos **choisis explicitement par l'user (`UserProfile.rest_weekdays`, getDay — sélecteur partagé `RestDaysPicker` dans les éditeurs Repas ET Sports) sinon déduits auto de `training_days_per_week`** (`restDaysForProfile` → repli `restDaySet`). `rest_weekdays` : `undefined` = auto (legacy) · `[]` = aucun repos · `[n,…]` = jours choisis (mappés sur les index du plan via `plan_weekdays`). Sélecteur pré-rempli avec les repos EFFECTIFS (`effectiveRestWeekdays`) → enregistrer sans changer ne touche pas au plan ; un repos doit être un jour planifié. `rest_weekdays`/`training_days_per_week`/`plan_weekdays` ajoutés à `profileSignature` (régénère au changement). Persisté `PROFILE_COLS` + migration `2026-06-19_profiles_rest_weekdays.sql` (`int[]` nullable — ⚠️ à exécuter dans Supabase). Effet : mêmes kcal+protéines mais **glucides ↓ / lipides ↑** (`restDayRatio`, isocalorique), `Meal.rest_day` marqué (UI 🛌). ⚠️ Le tag recette `rest_day_ok` ne sert plus à rien depuis le 2026-07-29 et a été **SUPPRIMÉ des données, du schéma et du type le 2026-08-03** (D22) : le jour de repos se joue UNIQUEMENT sur la cible. Recalage (`rebalanceCore`) et `swapMeal` ré-adaptent par ingrédient (portions toujours = 1 ; le `Meal` porte `adapted_ingredients`/`adapt_flags`). `resetTracking` reste idempotent. `ENGINE_VERSION` dans `profileSignature` → régénère les plans en cache. ⚠️ **Limites par conception** : `adaptRecipe` ne scale par ingrédient que si **TOUS** les ingrédients ont une `ref` résoluble (sinon repli macros de base — protège les overrides perso mixtes ref+`food_id`) ; et le plancher protéique étant sacré, un **gros** écart hors-plan sur une sèche dense (peu de gras/glucides à raboter) ne peut pas être totalement absorbé → le total dépasse honnêtement plutôt que d'affamer les protéines. Profils legacy gérés par replis `??`.
- **Recaler ma journée** (différenciateur North Star, anti-abandon) : `rebalanceDay` recalcule les **portions** des repas restants pour rester dans la cible (même recette ; pour changer de plat = `swapMeal`). `Meal.status` planned/eaten/skipped + `locked_macros` ; `MealPlan.day_extras` (kcal hors plan) ; `effectiveMacros` + `computeDailyTotals`. **Auto-reset quotidien** : `resetTracking` quand `plan.tracking_date` ≠ aujourd'hui (« nouvelle journée = page blanche »).
- **Hors-plan = sur CONSENTEMENT (refonte en cours, cf. [[offplan-redesign]])** — **Morceaux 1+2 livrés**. (1) `logOffPlan` n'auto-recale **plus** ; il enregistre l'écart (`day_extras`, compté à part) puis ouvre un `ActionSheet` Oui/Non. *Oui* → `rebalanceDay` ; *Non* → rien ne bouge. Total affiché en split « {plan} + {extra} kcal assumées ». `clearOffPlan` ne recale plus. (2) `OffPlanSheet` a un toggle **« Chercher un aliment » (Ciqual + quantité → kcal) / « Estimer vite » (chips + kcal libre)**. ⚠️ Ne remonte que les kcal (le nom n'est pas encore stocké). (3) **Conscience de l'heure** (`lib/mealtime.ts`) : `MEAL_HOUR` (8/13/16/20h), `isMealUpcoming` (heure + statut, `GRACE_HOURS=1`), `remainingMeals`/`remainingMealLabels` (ordre chrono). La feuille de consentement annonce « il te reste collation et dîner ». (4) **Adaptation à OPTIONS** (`adaptDayOptions` dans planEngine) : la feuille propose `spread` (répartir), `skip_snack` (sauter la collation → le reste se densifie), `focus_dinner` (n'ajuster que le dîner) selon les repas restants ; chaque option = un plan prêt + preview kcal ; protéines pleines. Moteur factorisé en `rebalanceCore(adjustIds, skipIds)` (`rebalanceDay` délègue, iso-comportement). **Refonte hors-plan COMPLÈTE** (4/4).

- ✅ **CATALOGUE DE RECETTES — audit, correctifs et brief de la prochaine vague (2026-07-29).** 14 agents (6 auditeurs → 6 réfuteurs adverses → décision → rédaction), puis une passe de réconciliation qui a invalidé une partie des conclusions de l'audit lui-même. Brief : `Recette/BRIEF-GENERATION-RECETTES.md`.
  - 🔴 **Régimes faussement dérivés — le risque le plus grave, `restrictions_ok` faisant autorité sur tous les chemins.** Trois trous : `levure_maltee` absente de `VIOLATIONS` (le malt est de l'orge) alors que 4 recettes revendiquaient « sans gluten » dans leur `why` ; **sauce soja citée dans les instructions de rep05/rep46/rep80 sans figurer dans `ingredients[]`** — invisible du dérivé alors que le code la déclare lui-même gluten-violante ; `pesto` mappé sur « Sauce pesto préemballée » (ciqual-11179, base fromage) mais hors table → 3 recettes faussement sans lactose. Mesuré : `gluten_free` 206 → 199, `lactose_free` 226 → 223. **Règle qui en sort** : sur le gluten, l'incertitude se tranche en EXCLUANT (précédent de l'avoine non certifiée) — un faux négatif retire une recette, un faux positif sert du gluten à un cœliaque.
  - 🔴 **`yaourt_grec` servait 3 g de protéines au lieu de 9.** Il pointait sur ciqual-19860 « Yaourt à la grecque nature » = le DESSERT français (3 g P, 8,2 g L), pas un grec égoutté. Ciqual gagnant sur la valeur manuelle, 6 recettes servaient **48 à 61 %** de protéines de moins que leur fiche. Ciqual n'ayant ni yaourt égoutté ni skyr, le ref est **DÉMAPPÉ** (règle du fichier : « à peu près pareil » = valeur manuelle assumée) et renommé « Yaourt grec égoutté (type Fage) ». Écarts ramenés à ±6 %.
  - ✅ **Le temps de préparation ne filtre plus rien.** Le curseur vivait dans le MÊME prédicat que le régime (`recipeAllowed`) : quand il vidait le pool, le repli lâchait les deux. Au réglage **par défaut** (15 min), un végétarien avait **ZÉRO** repas complet compatible sur 170 et recevait de la viande ; un sans-gluten en avait 6, un profil sans restriction 13. Retiré de l'onboarding, du profil, du check-in et du moteur ; `max_prep_time_min` reste en base, **inerte** (même parti pris qu'`activity_level`), hors `profileSignature`. Mesuré après : **0 repas hors régime** sur tous les profils. `temps_min` reste affiché. À réintroduire un jour en **préférence pondérée, jamais en filtre dur**.
  - ✅ **`rest_day_ok` retiré du départage.** Il déplaçait 30 à 36 % des repas des jours de repos, sans test, et sa seule doc disait « stocké, non utilisé ». Un tiers du catalogue le portait à contre-sens (8 recettes taguées « jour off » à plus de 50 % de kcal glucidiques, alors que le jour de repos est celui où le moteur COUPE les glucides). Le jour de repos se joue sur la CIBLE (`restDayRatio`) puis sur l'adaptation des quantités. **Décision fondateur : un tag posé à la main n'arbitre pas mieux qu'un moteur qui mesure.** `recomp_flag` supprimé au passage (champ mort, 5 recettes marquées quand ~40 le méritaient).
  - ✅ **Ancre protéine rendue à 11 recettes** (13 → 2 sans ancre) : un laitier portant 58 à 89 % des protéines du plat était déclaré `dairy` (bande 0,6–1,6, pas de plancher protéique) au lieu de `protein` (1,0–1,7). Restent col05 et col10, dont la protéine dominante est un corps gras — cas explicitement autorisé par le README.
  - ✅ **Contrôle anti-doublons EXÉCUTABLE** (`scripts/check-doublons.ts`, `npm run check:doublons -- <drop.json>`) + **cliquet** en test (`doublons.test.ts`). Confronte un lot au catalogue **et les recettes du lot entre elles** — c'est ce second contrôle qui manquait et qui a produit 8 groupes de clones sur trois vagues. 7 clones stricts et 2 noms identiques différenciés **sans supprimer une seule recette** (le catalogue a des cases minces). Compteurs : R1 92→85, R2 78→75, R5 22→18, R4 16.
  - ✅ **Champ `wave`** sur chaque recette, rétro-rempli en DÉRIVANT la partition des dossiers de `Recette/drops/` : `fondation` 100, `2026-06-19-vegan` 164, `2026-07-22-sans-gluten` 50. (Le drop « sans gluten » en contenait 214 = 164 reprises + 50 neuves — sans l'intersection, le compte était faux.)
  - ⚠️ **LA LEÇON DE MÉTHODE — un proxy de mesure a produit deux conclusions fausses.** Le script d'audit figeait le partage glucides:lipides de la cible à **55/45** — la valeur de REPLI de `carbFatRatio`, celle qui ne sert qu'à un profil sans ratio. Le moteur le DÉRIVE du profil : **65/35 en sèche, 68/32 au maintien, 69/31 en prise de masse**. Avec 10 à 14 points de lipides en trop, tout paraissait manquer de gras. Sont tombés : (1) « le catalogue est structurellement trop maigre » — sur les repas SERVIS le flag dominant est `carbs_below_target` (414) et non `fat_below_target` (157), le brief demandait de corriger dans le mauvais sens ; (2) « la prise de masse végétale est le trou » — le pool passe de 7 à 24 sur ce seul correctif. **Ground truth substituée aux proxies** : `buildLocalPlan` sur 3 gabarits × 4 semaines, on compte les recettes DISTINCTES réellement servies. **Règle : mesurer sur le moteur, pas sur une réplique de ses formules.** Poids mort réel du catalogue = **38 %** (118/314), pas 46 %.
  - 📋 **Vague en cours : 113 recettes** (`Recette/BRIEF-GENERATION-RECETTES.md`, 1185 lignes, auto-portant ; le chiffre est passé de 30 à 113 — cf. la section « Catalogue de recettes » en fin de doc). Seules deux poches subsistent : petit-déj de prise de masse végétal ou sans gluten (9 à 11 distinctes sur 4 semaines), et **vegan + sans gluten en sèche** sur les quatre créneaux (11 à 12). B1 10 petits-déj (`pd79`–`88`), B2 14 repas complets (`rep171`–`184`), B3 6 collations (`col67`–`72`) — **tout vegan ET sans gluten**, ce qui remplit les 7 régimes d'un coup (`vegan ⊂ végétarien ⊂ pescatarien ⊂ no_pork = halal`). Enveloppes = les cibles que l'app calcule pour le gabarit médian, pas des moyennes inventées. **Génération prévue via Claude chat, bloc par bloc**, avec retour ici pour vérification mécanique avant merge. **Reste à faire** : un `npm run check:recettes` qui contrôle l'enveloppe (règle R8 du brief, aujourd'hui manuelle) ; l'axe **allergènes** (le `tahini` introduit le sésame, aucun champ ne le porte) ; les 16 groupes R4 restants, qui sont des familles saturées (whey+avoine ×6, yaourt de soja sans féculent ×8) à régler en écrivant AILLEURS, pas en réécrivant l'existant. ⚠️ **Ces trois « reste à faire » sont PÉRIMÉS** : `check:enveloppe` existe (règle R8, `mesure-couverture.ts --enveloppe`), l'axe allergène a été tranché — on n'en crée pas, cf. **D3** — et le compteur R4 s'est révélé être le mauvais instrument, cf. **D18**.

## Écrans
- **Plan** : jours pleine largeur, salutation « Salut {prénom} », tap repas → fiche, **résumé du jour SANS CARTE, en en-tête typographique (refonte design 2026-08-03) ; chiffre héros = ce qui a été MANGÉ sur la cible (« 0 / 2 069 kcal ») — c'est le seul cadran qui bouge quand on coche un repas ; le total PRÉVU descend en sous-titre (« 2 070 kcal prévus sur la journée, rien de coché » / « · reste X kcal » en cours de journée), avec l'écart à la cible seulement s'il sort de la tolérance. ⚠️ Le héros était le total PRÉVU depuis le 2026-06-18 — rien n'a été perdu, l'ordre de lecture a changé ; ne pas re-promouvoir le prévu sans le dire (deux gros chiffres = personne ne sait lequel compte). Le TDEE n'apparaît pas ici (→ Profil)**, bouton « J'ai cuisiné » sur chaque carte (verrouille + déduit frigo + recale + série), « Je l'ai sauté », « J'ai mangé hors plan » (`OffPlanSheet`). **Synchro frigo non-bloquante** : si le frigo est suivi, la carte montre « Tout est dans ton frigo » / « Il te manque : X » + bouton en contour. **Depuis le 2026-08-06, un raccourci « Mes courses › » est posé à droite de cette ligne** — et il ne dit PAS « Ajouter » : `recipeCoverage` et `buildShoppingList` appliquent exactement les mêmes exclusions (condiments, repas gérés), donc ce qui manque est DÉJÀ dans la liste. Un bouton d'ajout n'ajouterait rien et confirmerait un geste qui n'a pas eu lieu. ⚠️ JAMAIS désactivé (sinon casse le North Star pour qui ne suit pas son frigo). Courses/frigo/fibres lisent les **quantités adaptées** du repas via `mealIngredients(meal)` (adapted si présentes, sinon recette×portions — plans en cache d'avant la refonte). **Fiche repas** (`RecipeDetail`) : quantités adaptées, **badges objectif/sport**, ligne **« Pourquoi »** (`why_fr`), avertissements `adapt_flags` (sous/au-dessus cible) + bandeau si repli régime (`restriction_relaxed`). **Repas fixes gérés par l'user (`FixedMeal`, ENGINE_VERSION 8) :** un créneau peut passer en « Je gère » (petit-déj/collation récurrent défini UNE fois via `FixedMealSheet` : recherche Ciqual + quantité, ou champ libre nom + P/G/L) → **macros soustraites du budget** par le moteur (`buildLocalPlan` : les repas planifiés visent cible − fixes ; `mealTarget` inchangé), carte **verrouillée** — surtitre « · TU GÈRES » + note « Tu gères ce repas — compté dans ton total », **sans icône** : `RepasLibreIcon` existe mais ne sert que dans Profil → Paramètres des repas, `MealCard` n'importe pas `Icons.tsx` — comptée dans le total mais **jamais cuisinée/swappée/recalée** (exclue de `adjustIds`/`adaptDayOptions`/`swapMeal`) ni mise dans les courses. Réglable dans **Profil → Paramètres des repas** (retiré de l'onboarding 2026-06-20). Persisté `profile.fixed_meals` (jsonb ; `PROFILE_COLS` + migration `2026-06-18_profiles_fixed_meals.sql` — ⚠️ à exécuter dans Supabase). Tests : `fixedMeals.test.ts`. **Resserrage écart jour-à-jour (`tightenDay`, ENGINE_VERSION 9, 2026-06-18) :** le plan canonique (seed 0) était déjà serré (≤2%), mais le **reroll** (« Nouveau plan », seed≠0) faisait déborder le total certains jours sur **pool contraint** (prep court / régime / dislikes). `buildLocalPlan` lance après sélection un **water-filling** qui ré-adapte les MÊMES recettes (variété préservée) pour coller le total du jour à la cible, en redistribuant le reliquat des repas saturés vers ceux qui ont de la marge ; **garde-fou « jamais pire »** (le scaling discret peut dégrader → on annule si le total ne se rapproche pas). ⚠️ Limite : si le pool ne peut PAS atteindre la cible (ex. 4000 kcal en recettes 10 min), l'écart subsiste — vrai levier = ajouter des recettes. **Lissage hebdo (ENGINE_VERSION 10, 2026-06-18) :** les CALORIES sont lissées sur la semaine — chaque jour vise `cible ± DAILY_SMOOTH_CAP` (50 kcal), le reliquat est reporté (`weekDeficitKcal`) → la **SEMAINE** converge vers `days×cible` (un jour bridé est rattrapé par les suivants). **Protéines NON lissées** (plancher quotidien). Garde-fou §6 : jamais < `MIN_KCAL`. Tests : `dayTotalTightness.test.ts`.
- **J'aime / j'aime pas / changer par recette (2026-06-19) — le bouton « Nouveau plan » est RETIRÉ.** On ajuste recette-par-recette dans la fiche (`RecipeDetail`) : 👍 (favori, existant), 👎 « j'aime pas », et « Remplacer ce repas ». **👎** ajoute la recette à `UserProfile.hidden_recipes?` (text[], souple/RÉVERSIBLE — jamais un bannissement définitif) et **change le repas** (`swapMeal`). **Dureté inversée vs régime** : le **régime devient le mur dur** (`poolForWithFlag` ne relâche plus le régime tant qu'il reste ≥1 recette compatible — un végé n'a QUE du végé), le **👎 est la couche souple** (ré-affichée en TOUT dernier recours si elle vide le pool ; `relaxed=true` ne concerne plus que le régime). **Trop de 👎** → quand `mealPoolSize(profile, mealType) < DISLIKE_THRESHOLD` (3), on ouvre `DislikeSheet` « quel ingrédient te gêne ? » (candidats = ingrédients récurrents des recettes masquées, `lib/dislike.ts`) → ajout à `disliked_foods` + **ré-affichage des plats masqués SANS cet ingrédient** (`applyDislikedIngredient` : on garde masqués seulement ceux qui le contiennent). **« Remplacer ce repas »** biaise désormais vers les **favoris** (`swapMeal(…, favoriteIds)`) à fit comparable. ⚠️ `hidden_recipes` est **HORS `profileSignature`** (un 👎 change UN repas, ne régénère pas la semaine) ; `disliked_foods`, lui, EST dans la signature → régénère. **Régénération globale** (escape hatch) déplacée, discrète, dans **Profil → « Régénérer mon plan »** (pose `@kyroz:planReroll`, consommé au focus de l'écran Plan → `generate(true)`). **Profil → Préférences alimentaires** liste les **« Recettes masquées »** (réafficher en un tap). Persisté `PROFILE_COLS` + migration `2026-06-19_profiles_hidden_recipes.sql` (`text[]` nullable — ⚠️ **à exécuter dans Supabase, sinon TOUT le push profil retombe en PGRST204**). Tests : `dislike.test.ts` (+9). Vérifié en preview web (👎 swap live, 0 erreur). **MAJ UI 2026-06-19** : les 3 actions sont aussi **directement sur la carte du repas** (`MealCard`) — bouton « J'ai cuisiné » réduit (flex) + boutons-icônes ♥ favori / 👎 / 🔄 changer à côté, sans ouvrir la fiche. Handlers factorisés dans `plan.tsx` (`swapMealCore`/`dislikeMealCore`) partagés carte + fiche ; les actions carte ne touchent pas à `selectedMeal`. Le favori carte passe par `useFavorites` (la fiche garde aussi ses boutons).
- **Courses** (« Liste de courses ») : **ne propose que ce qui MANQUE** — `buildShoppingList(plan, pantry)` soustrait le garde-manger (couverture partielle → reste à acheter ; entièrement couvert → masqué ; soustraction à unité identique seulement). Liste vide non mise en cache (sinon bloquée sur « rien à acheter »). **TROIS états vides distincts** depuis le 2026-08-08 : « Aucune liste » (pas de plan) · « Rien à acheter » (le frigo couvre tout) · **« Liste vidée »** (tout a été retiré à la main, avec un bouton **Rétablir** — l'état vide n'étant pas défilant, sans lui retirer le dernier article était un cul-de-sac). Liste cochable ; **cocher → l'article va direct au frigo ; décocher → retire SEULEMENT la quantité ajoutée** (`subtractQuantity`, borné à 0 → ne touche pas au stock saisi à la main). Boutons **« Tout cocher »** (tout au frigo) / **« Réinitialiser »** (symétrique : retire du frigo les quantités cochées, stock manuel préservé). Vérifié en preview 2026-06-17 (stock manuel 200 g + 250 cochés → 450 → 200 au reset). **« Courses terminées » + historique (2026-08-07, `lib/shoppingHistory.ts`, `components/ShoppingHistory.tsx`)** : une liste entièrement cochée restait à l'écran, barrée, **pour toujours** — le seul moyen de la solder était de tirer pour rafraîchir, donc de connaître un geste que rien n'annonce. Le bouton apparaît dès **1 article coché**, discret tant qu'il reste des cases, **en accent quand tout est coché** (un seul bouton, deux poids : deux boutons auraient été deux libellés à garder d'accord pour un même geste). Il fait DEUX choses : la liste s'inscrit à l'historique (pris / non pris), et le cache `@kyroz:shopping` est vidé — donc `load()` la RECALCULE, les articles cochés sont déjà au frigo et disparaissent, les autres reviennent non cochés. ⚠️ **Rien n'est ajouté au frigo à la clôture** : chaque article y est parti au moment où il a été coché. **Depuis le 2026-08-08 (E21), la confirmation est un CHOIX** (`choose`) quand il reste des non-cochés : les garder pour la prochaine fois, ou les retirer. Avant, l'écran annonçait « ils resteront dans ta liste » et les gardait d'office — les deux issues sont légitimes et l'utilisateur seul sait laquelle est la sienne. ⚠️ « Les retirer » ne peut pas se contenter de les effacer : terminer VIDE le cache, donc la liste se refait depuis le plan et les non-cochés reviendraient. Ils sont donc ÉCARTÉS (`ecartesApresCloture`).
  **RETIRER un article — appui long** (`lib/shoppingRemoved.ts`, clé `@kyroz:shopping:ecartes`, LOCAL-ONLY). 🔴 **Clé à part et pas un champ de la liste** : `plan.tsx` efface `@kyroz:shopping` à chaque `persistPlan`, donc une suppression rangée dedans se déferait toute seule quelques minutes après le geste. ⚠️ Pas un balayage — un glissement ne se vérifie qu'au simulateur (§5) ; l'appui long n'est qu'un délai sur le press. Pas découvrable pour autant : annoncé sous les contrôles et dans la bulle de visite guidée. Un article COCHÉ qu'on retire est d'abord DÉCOCHÉ (il est déjà au frigo). Les compteurs, « Tout cocher », « Réinitialiser » et l'historique portent sur les VISIBLES. Bandeau « X articles retirés · Rétablir ». L'écart est ÉPHÉMÈRE (tirer pour rafraîchir, terminer, ou Rétablir le remettent à zéro) et se NETTOIE à chaque chargement, sinon la clé grossirait sans fin. Tests : `shoppingRemoved.test.ts` (19, 6 mutations). ✅ **Geste vérifié sur le déploiement le 2026-08-08 par le fondateur** — il n'avait pas pu l'être en session (cf. E21). **Historique** : feuille depuis la pilule « Historique », **et depuis l'état vide** (« Rien à acheter » est justement le moment où on se demande ce qu'on a pris) ; accordéon date + nombre d'articles PRIS, détail à la demande, groupe « NON PRIS » grisé, suppression d'une sortie (par HORODATAGE, jamais par rang : la liste est inversée). **LOCAL-ONLY** (`@kyroz:shoppingHistory`, aucune table, aucune migration — même raisonnement que le journal hors plan), borné à **30 sorties / 180 jours**. ⚠️ Ce qui est archivé est **ce que la liste demandait**, pas ce qui est passé en caisse (l'écran le dit) — Kyroz ne sait pas qu'un paquet de 1 kg a été pris pour 700 g. ⚠️ Le refus d'archiver une sortie vide vit dans `recordTrip`, PAS dans la condition d'affichage du bouton. Tests : `shoppingHistory.test.ts` (20, dont 3 vérifiés par mutation). Vérifié en preview 2026-08-07 (1 coché sur 54 → confirmation → 53 restants + pilule Historique ; tout cocher → bouton accent → « Rien à acheter » + « Mes courses passées » ; suppression ciblée sur deux sorties du même jour).
- **Frigo / garde-manger** (`lib/pantry.ts`) : alimenté par les courses cochées, déduction après cuisson, recettes réalisables (`recipeCoverage`). Ajout manuel = champ nom avec **suggestions Ciqual** (autocomplétion via `searchFoods`) MAIS **texte libre conservé** — volontaire : ne pas imposer les noms cliniques Ciqual qui casseraient le matching frigo↔ingrédients de recettes (par nom).
- **Recettes** : recherche par nom (insensible accents/casse) + filtres + favoris (`useFavorites`) + **badges objectif, DEUX au maximum** sur chaque carte (libellés DRY `lib/recipeLabels.ts` ; les badges SPORT ne sont plus affichés depuis le 2026-08-03 — diversifieur interne, pas une promesse). Édition perso (overrides) → `lib/recipes.ts` (`getEffectiveRecipes`…), `RecipeEditor`, sync table `recipe_overrides`. **Override d'une recette déjà au plan → `reAdaptMealRecipe` (planEngine) ré-adapte immédiatement le(s) repas concerné(s) au budget macro courant** (comme `swapMeal` ; repli legacy = macros de base × portions) : ingrédients + macros restent cohérents avec la recette affichée sans attendre le recalage — sinon courses/frigo/fibres (qui lisent `adapted_ingredients`) garderaient les quantités de l'ANCIENNE recette (fix 2026-06-17 ; vérifié en preview : retirer la banane du porridge → repas ré-adaptés + courses recalculées).
- **Profil** : en-tête (surtitre corps/objectif + grand titre — l'écran n'en avait AUCUN avant le 2026-08-03) puis **trois sections nommées** (Cibles du jour · Réglages · Préférences). Les réglages sont coupés en DEUX blocs — l'identité (corps, sport, objectif, objectif daté) puis « TON PLAN » (macros, préférences alimentaires, repas, banque, Kyroz+, régénérer) : dix lignes d'affilée faisaient un mur. Édition par catégorie en **feuilles** (⚠️ pas des routes, cf. §11). Puis Préférences (rappel, propositions d'ajustement, apparence, hydratation, statistiques), **Exporter mes données** RGPD art. 20 via `lib/exportData.ts` → download web / Share natif, **Confidentialité & CGU** → écran `/legal`, version, « Se déconnecter » (purge locale) et « Supprimer mon compte » — **seul rouge de l'écran**.
- **Suivi poids** (`lib/weight.ts`, `WeightCheckin`/`WeightChart`) : 1 pt/jour, cadence configurable, courbe SVG, photos local-only, check-in « ton plan te convient ? » (`usePlanCheckin`). ⚠️ **Dates en heure LOCALE** (`localStamp`, jamais `toISOString`/UTC → décalage d'un jour).
- **Streak** (`lib/streak.ts`, `useStreak`) : paliers 3/7/14…, `StreakProgress`/`StreakCelebration`, écritures sérialisées (verrou anti double-comptage J1). **Bouclier de série (`advanceStreak`, pur & testé, 2026-06-20)** : un jour manqué est PARDONNÉ (gel) si le bouclier est dispo ; il se recharge tous les 7 jours (1 gel / semaine). 2+ jours manqués (ou 1 sans bouclier) → reset à 1. `Streak.freeze_available` **LOCAL-ONLY** (non poussé par `pushStreak` → AUCUNE migration ; `undefined`=dispo, rétro-compat). Le gel → `froze` exposé par le hook → toast « Série protégée » sur le Plan. 🔴 **`StreakProgress` N'EXISTE PLUS — supprimé le 2026-08-14** (E48). La carte `variant='card'` du Profil avait déjà été réduite à une ligne le 2026-08-02 ; la série est désormais une **pastille dans l'en-tête**, identique à celle du Plan. Le chaînon de 7 jours n'est donc plus affiché NULLE PART (il avait quitté le Plan le 2026-08-05). Le mécanisme, lui, est intact : `advanceStreak`, les paliers et `StreakCelebration` tournent, et `chainProgress`/`streakMessage` restent dans `lib/streak.ts`, testés — le jour où le chaînon revient, rien à réécrire. Tests : `streak.test.ts` (gel/reset/recharge/legacy).
- **Rappel quotidien** (`lib/reminder.ts` + `lib/notifications.ts`, `useReminder`) : 1 notif locale/jour, no-op web. ⚠️ Sur web la **préférence est conservée** (ne retombe plus sur « Aucun ») + note « la notif arrive sur l'app mobile » — la vraie notif s'arme sur natif. **Refondu le 2026-08-07** : l'heure est LIBRE (interrupteur + champs `HH h MM`, `components/ReminderTimeField.tsx`), les trois créneaux d'avant (8h00 · 12h00 · 18h30) ne sont plus que des **puces de raccourci** dont l'allumage se DÉDUIT de l'heure. Stockage `'off'` ou `'HH:MM'` sous la même clé `@kyroz:reminder` ; `parseReminder` reprend les anciennes valeurs `morning|midday|evening` (la clé survit à la purge des données — sans reprise, le rappel de tous les réglages existants s'éteignait en silence). Le texte est **un titre ancré au moment de la journée + une CITATION** (`REMINDER_TITLES` 4 × 4, `CITATIONS` 15 — 6 signées du domaine public, 9 maximes maison ; + 3 messages de pesée, qui restent factuels parce qu'ils demandent un geste). Les deux index sont pris sur le JOUR de l'échéance, donc déterministes et testables. ⚠️ **Les deux compteurs doivent rester PREMIERS ENTRE EUX** — retirer une citation (16 → 15, avec 3 titres) a fait tomber le cycle du couple de 48 à 15 jours ; 4 × 15 = **60 jours**. ⚠️ **On n'attribue que ce qui tient** : « Que ton aliment soit ta seule médecine » n'est pas d'Hippocrate et « l'excellence est une habitude » est de Will Durant, pas d'Aristote — les deux que le registre pousse à mettre, absentes ici. Une maxime sans auteur s'affiche SANS signature, jamais sous un nom emprunté. ⚠️ Et **l'ORDRE du tableau est l'ordre des jours** : rangé par famille, il servait trois philosophes d'affilée puis neuf jours de maximes — invisible à la relecture, flagrant sur un aperçu de 14 jours. Entrelacé, et tenu par un test (jamais 3 de la même famille de suite, bouclage compris). ⚠️ **Le message est figé à la programmation** : un déclencheur `DAILY` répète le même contenu jusqu'au prochain ré-armement, et c'est le ré-armement au démarrage qui le fait tourner. L'alternative (N notifs datées d'avance, une par jour) a été écartée : elle S'ÉTEINT au bout de N jours sans ouverture, c'est-à-dire quand le rappel sert le plus.

- **Visite guidée** (`components/GuidedTour.tsx` = le moteur, `lib/tours.ts` = le contenu) : **5 tours, 20 bulles**, chacun déclenché **à la 1re visite de SON onglet** (`useScreenTour`) — plan 6 · profil 6 · recettes 3 · courses 3 · frigo 2 (la 3ᵉ du Frigo, « La vue À cuisiner », retirée le 2026-08-14 sur décision du fondateur ; le décompte est VERROUILLÉ contre le code par `visiteGuidee.test.ts`, il ne se recopie plus). Étendu le **2026-08-08** (E20) : il n'existait qu'un tour, sur le Plan, et 3 de ses 5 bulles étaient FAUSSES. **Le contenu est une fonction PURE sans import**, donc testable — `GuidedTour.tsx` tire react-native et ne l'est pas. Une étape conditionnelle se construit (`planTour({days, moduleParVolume})`, `profilTour({objectifDateDisponible})`) : une bulle vraie pour certains profils seulement se conditionne, elle ne se sert pas à tout le monde. **Ancrage** : `useTourTarget('id')` posé DIRECTEMENT sur l'élément (pas de View englobante → le spotlight épouse la border box) ; les composants qui n'exposent pas de ref reçoivent une prop `tourId` optionnelle (`MealCard.cookTourId`/`actionsTourId`, `MenuRow`, `WeightSummaryCard`). Dans une liste, la ref se crée au niveau de l'ÉCRAN et se pose sur `index === 0` — `renderItem` est une callback, pas un composant, on n'y appelle pas de hook. **Rejeu** : `TourButton` (le « ? ») sur les 5 en-têtes + « Revoir les tutos » dans le Profil (`resetAllTours`) — « Passer » marque le tour vu DÉFINITIVEMENT, et sans porte de sortie un tour passé par réflexe était perdu à vie. Bouton **« Précédent »** depuis E20. Mémorisé en AsyncStorage `@kyroz:tour:*`, **LOCAL-ONLY** (réglage d'appareil, aucune migration). ⚠️ **`startTour` écarte silencieusement les étapes dont la cible n'est pas montée** — légitime pour un bloc conditionnel (frigo vide), mais un id mal orthographié ou une ref perdue en refactorant fait disparaître une bulle SANS rien casser : le tour se joue plus court en ayant l'air complet. Avertissement en dev + `visiteGuidee.test.ts` qui exige que chaque cible citée existe dans le code. ⚠️ **Le portail de dépistage santé et la visite guidée interceptent les clics** : tout script qui pilote l'app doit les neutraliser (cf. `test/README.md`) — multiplier les tours multiplie les portes à fermer. 🔴 **Et le harnais n'en fermait qu'UNE** : `neutralizeFirstRun` posait le seul `:tour:plan`, écrit du temps où il n'existait qu'un tour. Les quatre autres se seraient armés au milieu d'un parcours, et un tour est une `Modal` dont les panneaux avalent les taps → « écran introuvable » en accusant l'écran. Corrigé le 2026-08-08, et la copie du harnais (du `.mjs`, il ne peut pas importer `lib/tours.ts`) est désormais VERROUILLÉE contre `TOURS` par `harnaisEcrans.test.ts`, dans les deux sens — vérifié par mutation, remettre l'ancienne ligne fait rougir 6 tests. ⚠️ Le tour du Plan attend la fermeture du reveal (`pret: !showReveal`), et celui du Profil reçoit un `scrollRef` sans lequel ses cibles basses (TDEE, bloc données) se mesureraient hors écran en natif.

## Data / thème / qualité
- **Base d'aliments** (`lib/foods.ts`, type `Food`) — **Phases 1→3a livrées** : dataset = **Table Ciqual 2025 officielle (ANSES), ~3341 aliments** dans `lib/foods.generated.ts` (AUTO-GÉNÉRÉ, ne pas éditer). Source brute (`data/ciqual/`, ~80 Mo) **gitignorée** ; régénérer via `python3 scripts/convert-ciqual.py` (stdlib, parse le `.xlsx` à plat → nom + kcal/prot/gluc/lip + groupe ; nettoie virgules/`traces`/`< X`/`-` ; ignore les aliments sans énergie). `searchFoods` (recherche libre accents/casse, classée préfixe>mot>sous-chaîne), `macrosFromIngredients`/`recipeMacrosPerPortion` (recalcul depuis `Ingredient.food_id`). ⚠️ **Licence Ouverte 2.0 (Etalab)** : `CIQUAL_ATTRIBUTION` affichée dans le profil (obligatoire — paternité, pas d'endossement). `Food.category` = groupe Ciqual (string libre). **Couche de curation (`lib/foods.curation.ts`, livrée)** : `FOODS = applyCuration(CIQUAL_FOODS)` — masque (catégories/motifs/ids : `aliments infantiles`, `pour bébé`, `nectar`…), renomme (« Banane, chair sans peau, crue » → « Banane »), corrige (`overrides`), et AJOUTE des aliments absents de Ciqual (`extraFoods` : `kyroz-whey`, `kyroz-skyr`). `foods.generated.ts` reste la copie ANSES intacte (recrachée par le script, jamais éditée) ; toute perso vit dans la curation (survit aux régénérations). Provenance honnête : ajouts/corrections marqués `Food.source='kyroz'`, attribution mise à jour en conséquence. **Phase 2 livrée** : le `RecipeEditor` lie les ingrédients à la base (recherche par ligne → `food_id`), toggle macros **Auto (calculées depuis les ingrédients)** / **Manuel** (repli). En Auto, `macros_per_portion` = `recipeMacrosPerPortion` au save → le plan suit. Non-breaking : les 50 recettes de base (sans `food_id`) s'ouvrent en Manuel, inchangées. **Décisions** : approche A (moyenne) d'abord, B (fourchette) après tests utilisateurs. **Phase 3b livrée** : marge honnête `± kcal` sur le total du jour — `kcalMargin()` (`DAILY_KCAL_MARGIN_PCT = 7%`, plus bas que l'incertitude par aliment car les écarts se compensent), affichée discrètement sous le total (`MarginNote` → « Valeurs estimées (moyennes alimentaires) » ; la fourchette « ≈ X–Y kcal · marge ± » a été RETIRÉE 2026-06-18 — elle donnait l'impression d'un plan imprécis, retour fondateur ; `kcalMargin()` conservé mais plus affiché). Feature base d'aliments **complète** (reste seulement l'approche B fourchette = post-tests utilisateurs).
- **Fibres** (`lib/fiber.ts`) : **sourcées Ciqual** (`Food.fiber_g`, col. 26 ANSES) par ingrédient — ref→food_id→repli nom (fix mesure 2026-07-23, cf. P3.1). `dailyFiberTarget` = 14 g/1000 kcal (16 en sèche), bornée [25,50].
- **Sync** (`lib/sync.ts`) : profil **colonne par colonne** (`PROFILE_COLS` + migrations idempotentes `supabase/schema.sql`) → ajouter un champ profil synchronisé = nouvelle colonne + migration. Tables profiles/streaks/favorites/pantry/weight_logs/recipe_overrides. Edge Function `delete-account`.
- **Analytics — tunnel d'activation (`lib/analytics.ts`, ACTIF depuis le 2026-08-18 ; refondu le 2026-08-10, cf. E26)** : mesure le North Star (où les gens décrochent). `capture(event, props)` reste **NO-OP** tant que le consentement ≠ `granted` — la clé, elle, est posée (secret GitHub + variable EAS), donc c'est désormais le SEUL verrou restant. En LOCAL, `.env` reste volontairement vide (voir `.env.example`) : sans clé, consenti → `console.log('[analytics:dormant]')` en dev, pour ne pas polluer le projet de prod avec des essais. PostHog **EU** (`eu.i.posthog.com`), POST direct (pas de SDK).
  **Identifiant : `distinct_id` PSEUDONYME et non anonyme** (uuid local `@kyroz:analyticsId`, jamais l'e-mail, jamais l'id Supabase — pas d'`identify`/`alias`). Il est stable, donc les events d'un même appareil se regroupent, donc supprimables : promettre l'anonymat ET la suppression serait se contredire. ➡️ Les métriques se lisent en **appareils**, jamais en personnes.
  **Consentement** : `@kyroz:analyticsConsent` (`granted`/`denied`/null). Demandé **UNE fois, sur son propre écran, AVANT l'assistant** — `components/AnalyticsConsentStep.tsx`, monté par `(auth)/onboarding.tsx` après le dépistage santé. Modifiable ensuite dans **Réglages (roue dentée) → Confidentialité**, où vit aussi « Supprimer mes statistiques » (e-mail pré-rempli portant le pseudonyme, affiché seulement si un identifiant existe). ⚠️ **Ne pas replacer cet écran plus tard dans le parcours** : sans tampon local, tout ce qui précède la réponse est perdu pour tout le monde — le tunnel d'entrée disparaîtrait (E26).
  **13 events**, tous porteurs de `jour_depuis_install` (jour 0 posé à la RÉPONSE, oui ou non) : `onboarding_started/step_viewed/completed/blocked` · `first_plan_viewed` (+`duree_generation_ms`, **le moteur seul, pas la pause de 600 ms**) · `plan_opened` · `meal_cooked` · `plan_regenerated` (`origine`) · `off_plan_logged` (`recale`) · `streak_milestone/frozen` · `plan_generation_failed` (`etape`) · `app_error` (`ecran`, `type` — jamais le message brut). Garde-fou : `lib/__tests__/analyticsPerimetre.test.ts` (interdits du §6, liste figée à 13), vérifié par 4 mutations.
  **⚠️ ACTIVATION — c'est un LOT, pas une variable** : projet PostHog Cloud EU → `EXPO_PUBLIC_POSTHOG_KEY=phc_…` **+ les textes légaux + couper l'IP côté serveur**, tout ensemble. Checklist complète : **E26**. Vérif preview : consentement accordé → events loggés ; refusé → strictement rien, et aucun pseudonyme créé.
  - **Garde-fou anti-perte (C, 2026-06-18, `lib/syncGuard.ts`)** : `pushProfile` lit le `{ error }` Supabase (qui ne lève PAS d'exception sur erreur SQL) → ne « confirme » que sur succès réel. Flag « dirty » posé à chaque sauvegarde locale du profil (`markProfileDirty`), levé seulement par un push confirmé. À l'hydratation, un profil local **dirty n'est JAMAIS écrasé** par le cloud — il est (re)poussé (`decideProfileHydration`, pure + testée). Effet : un schéma désaligné (cf. piège ci-dessous) devient un **no-op bénin** au lieu d'une perte de données. **Périmètre = profil seul** (vecteur catastrophique) ; les autres miroirs gardent le push best-effort historique.
  - ⚠️ **Piège (corrigé 2026-06-14)** : modifier `schema.sql` n'applique RIEN au projet Supabase live. `weight_logs` + `recipe_overrides` y manquaient → **404** (suivi du poids + recettes perso ne syncaient pas, invisible car AsyncStorage local prend le relais). **Après tout ajout de table/colonne : coller le SQL dans Supabase → SQL Editor → Run.** Les migrations ciblées vivent désormais dans `supabase/migrations/` (idempotentes).
- **Mise en page** (`constants/layout.ts` + seuils purs dans `lib/layout.ts`, 2026-08-01) : l'app est livrée pour iPad (`ios.supportsTablet: true`). **Tout écran passe par `useLayout()`**, comme toute couleur passe par `useTheme()` — sinon il repart en pleine largeur et devient illisible à 1024 pt. Seuil unique `TABLET_MIN_WIDTH = 700` (au-dessus du plus large iPhone, 440, et d'un Split View à 50 % sur iPad 11", 507). Colonnes : `content`/`header` 620, `sheet` 820 (déjà posé dans `Sheet` et `ActionSheet`), `grid` 980 avec `layout.columns`. **No-op STRICT sous le seuil** (`centered()` renvoie `{}`) — un test l'exige, le rendu téléphone ne doit pas bouger d'un pixel. Une seule mise en page dérogatoire : l'écran recette met ingrédients et préparation côte à côte. Règle de non-régression : aucune colonne plus étroite que la zone utile d'un iPhone (345 pt), verrouillée par `lib/__tests__/layout.test.ts`. Orientation : **portrait** (le paysage est une décision à part).
- **REFONTE DESIGN — passe 1 : les 5 onglets (2026-08-03, ✅)** *(la passe 2, qui couvre tout le reste, est la puce suivante)* — inspirée de maquettes Claude Design, dont le fichier vit dans `mockups/` (hors dépôt app). **Découverte principale : la DA de la maquette ÉTAIT DÉJÀ celle du thème** — palette système iOS des deux côtés, seules 4 valeurs divergeaient (carte sombre `#121214`→`#1C1C1E`, `cardElevated`→`#2C2C2E`, `fill`→`quaternarySystemFill`, `secondaryLabel` sombre→`235,235,245`). Le vrai chantier n'était pas la palette mais **les couleurs de macro** : `protein`/`carbs`/`fat` valaient bleu/jaune/rouge à **32 endroits**, y compris des listes où il n'y a aucune proportion à comparer. Elles sont devenues **trois NUANCES d'un même gris** — la couleur ne porte une information que dans une BARRE. ⚠️ **Ne pas re-coloriser un seul écran** : c'est le mélange des deux grammaires qui faisait le bruit. Ajouts : `Radius.card` 22, `Radius.button` 14, `Type.display` 34/700/-0,9. Accent : le graphite (`#6F7274` / `#8E8E93`) essayé ce jour-là a été **ANNULÉ le 2026-08-03 même** — il contredisait CLAUDE.md §8, et le fondateur a tranché l'inverse : monochrome par DÉFAUT + accent **personnalisable** (bulle ci-dessous). ⚠️ Cette ligne a annoncé « décision en attente » alors qu'elle était prise : une note d'attente ne se relit jamais, elle se referme dans la livraison qui la résout. ⚠️ **Un écart assumé avec la maquette** : son 3ᵉ gris clair (`#DDDDDF`) tombait à **1,21:1** contre le fond — le segment lipides était invisible. Remplacé par les gris système iOS successifs (1,50:1). ➡️ Une valeur relevée sur une maquette se VÉRIFIE à l'écran. **Fait** : Plan (synthèse sans carte, héros = mangé/cible), Recettes, Courses (un bloc par rayon, pastille ronde), Frigo (renommé depuis « Garde-manger » **partout**, croix de suppression retirée, pas-à-pas −/+ où 0 retire), Profil (en-tête ajouté, trois sections nommées, réglages en deux blocs, icônes de liste retirées), + les **5 icônes d'onglets** redessinées d'après les tracés de la maquette (`components/TabIcons.tsx` — en SVG et pas en librairie : Ionicons n'a ni frigo ni bol, et MaterialCommunityIcons pèse 1,2 Mo contre 381 Ko).
  ⚠️ **Le passage des macros en gris a mis à nu TROIS détournements** de `t.protein`/`t.carbs`/`t.fat`, où la couleur ne codait rien : un delta « vs maintenance » qui empruntait jaune/bleu comme code de statut, quatre listes de macros empilées (Profil, MacroSplit, RecipeDetail, RecipeEditor) où il n'y a aucune proportion à comparer, et les **confettis d'anniversaire** — devenus douze pastilles grises, réparés avec une palette festive locale (seul endroit de l'app qui a droit à de la couleur franche). ➡️ **Un token détourné survit tant que sa valeur reste jolie ; il casse le jour où le token change de sens.** Il ne reste qu'UN usage des couleurs de macro : la BARRE du Plan — un `grep` le vérifie en deux secondes.
- **REFONTE DESIGN — passe 4 : l'écran Plan allégé + l'accent étendu (2026-08-06, ✅)** — session de design menée avec le fondateur, écran par écran, contre les maquettes Claude Design. **Ce qui part de l'écran Plan** : les fibres et « Valeurs estimées (moyennes alimentaires) » (⚠️ le moteur vise les fibres exactement pareil, il ne l'AFFICHE plus — décision fondateur, ne pas les réintroduire en croyant réparer un oubli) · le bandeau `StreakProgress variant="strip"` (le compteur de l'en-tête reste ; le bandeau vivait alors encore dans le Profil en `variant="card"` — **ce n'est plus vrai depuis le 2026-08-14**, cf. E48) · la carte d'hydratation, désormais **masquée par défaut**. **Ce qui change de forme** : le sélecteur de jours perd ses cartes de 58 pt pour une lettre, un chiffre et une **pastille en accent** sur le jour actif, avec une **lune** sous les jours de repos (même symbole que la phrase juste en dessous — deux marqueurs pour la même chose sur un écran, c'est ce qu'on corrige) ; « J'ai mangé hors plan » et « Ma répartition (%) » passent sur **une ligne, sans fond** — deux pavés remplis sous le chiffre du jour pesaient plus que lui.
  🔴 **LA BARRE DE MACROS SUIT L'ACCENT, EN TROIS NUANCES** (décision fondateur). Le principe de la passe 2 est intact — trois nuances d'UNE couleur, jamais trois teintes ; ce qui change est que cette couleur n'est plus forcément le gris. **En monochrome (le défaut, donc la DA que voit la majorité) les gris système sont gardés EN DUR** : les dériver ferait bouger la DA par défaut pour un changement qui ne concerne que ceux qui choisissent une couleur. ⚠️ **Une nuance ne se choisit pas « un peu plus claire », elle se MESURE** — c'est le défaut `#DDDDDF` à 1,21:1 de la maquette. `macroShades` recule vers l'accent tant que la nuance ne tient pas **1,5:1 contre le fond de page**. Mesuré sur les 6 accents × 2 thèmes : le plancher ne mord JAMAIS, le cas le plus serré est **orange/clair à 1,53:1** (marge 0,03) — donc le mécanisme de recul n'est traversé par aucun accent livré, et un test hostile le traverse volontairement. Garde-fou : `accentColor.test.ts` (44 tests), **vérifié par mutation**.
  🔴 **DEUX RÉGLAGES NE SE PROPAGEAIENT PAS, ET LES DEUX ÉTAIENT DORMANTS.** (1) Le suivi d'hydratation se relisait « à chaque focus d'écran » via `useFocusEffect` — cette relecture n'atteignait jamais l'écran Plan : basculer sur « Masqué » laissait la carte en place jusqu'au **redémarrage de l'app**. Invisible tant que le défaut valait « affiché » ; inverser le défaut l'a révélé d'un coup. (2) Le **prénom** ne s'écrivait qu'à un seul endroit de toute l'app — la dernière étape de l'onboarding — et **aucun écran ne permettait de le poser ni de le corriger** : un compte antérieur à cette étape affichait « Ton plan » à perpétuité, sans recours (signalé par le fondateur). Il était en plus lu UNE fois au montage du Plan. ➡️ **Règle : un réglage lu par un AUTRE écran que celui qui le pose ne se relit pas « au focus », il se DIFFUSE.** Les deux passent au patron déjà employé par `themeMode.ts` et `accentColor.ts` (store externe + `useSyncExternalStore`, chargé une fois dans le layout racine), et un champ **Prénom** est ajouté à Profil → Informations. Vérifié par le vrai geste, à l'écran : masqué → « Affiché » → carte présente immédiatement ; sans prénom « Ton plan » → prénom posé → « Salut … » sans redémarrage.
  ⚠️ **Le raccourci « Mes courses › » n'est PAS un bouton « Ajouter »** — voir la ligne Plan de §Écrans : la liste de courses est CALCULÉE (plan moins frigo), donc ce que la carte annonce manquant y est déjà.
  ✅ **LES 55 ÉMOJIS SONT PARTIS (même jour).** Et ils ne se traitaient pas tous pareil — c'est la seule chose à retenir : **39 tenaient la place d'une ICÔNE** et sont devenus 17 tracés dessinés par Claude Design dans le gabarit des onglets (`components/Icons.tsx` — viewBox 27, trait 1,7, bouts arrondis, aucun remplissage, couleur passée de l'extérieur) ; **16 n'étaient qu'un TON DE VOIX** (« Journée réadaptée 👊 », « +450 kcal assumées 😎 ») et ont été **SUPPRIMÉS, pas remplacés** — aucun pictogramme ne remplace une ponctuation, et la phrase doit tenir sans elle. ⚠️ **Un émoji dans une CHAÎNE ne peut pas devenir une icône** : un toast est une string, pas du JSX. Ceux-là ont été retirés et la phrase reformulée (« Noté 👎 » → « C'est noté »). Les autres sont devenus une rangée icône + texte, plus verbeuse — c'est le prix pour qu'un pictogramme suive le thème et l'accent, ce qu'un émoji ne saura jamais faire. ⚠️ Le passage a cassé `MacroSplit.tsx` : la pose automatique de l'import est tombée **au milieu d'un import multi-ligne**. `tsc` l'a vu tout de suite — mais une insertion « après le dernier import » n'est pas sûre dès qu'un import tient sur plusieurs lignes. Vérifié à l'écran : fiche recette (durée, portion, fibres) et carte d'hydratation, en clair ET en sombre.

- **DESIGN SYSTEM POUSSÉ VERS CLAUDE DESIGN (2026-08-06, ✅)** — projet « Kyroz — design system » créé sur le compte du fondateur, 6 pages : principes · couleurs · accents · rayons · typographie · espacements. **Motif mesuré, pas théorique** : sur la dernière maquette, 4 valeurs divergeaient du thème et **une était un vrai bug** (le 3ᵉ gris à 1,21:1 → segment lipides invisible), plus un `blur(22px)` irréalisable sans dépendance native. Un design system n'embellit pas les maquettes — **il les empêche d'inventer des valeurs que personne ne vérifie**.
  ⚠️ **Le miroir est GÉNÉRÉ, jamais écrit à la main** (`npm run design:build` → `scripts/design-system.mjs`, sortie `design-system/` gitignorée). Une copie écrite à la main serait exactement la « seconde source de vérité qui attend son bug » : le jour où `theme.ts` change sans le miroir, Claude Design dessine contre une DA qui n'existe plus et rend des maquettes plausibles.
  ⚠️ **L'extraction lit `theme.ts` COMME DU TEXTE** (il tire react-native, donc pas importable sous node — même procédé que `accentColor.test.ts`). Elle s'est cassée DEUX fois pendant son écriture, et **aucune des deux ne lève d'erreur** : (a) les sous-objets écrits sur une ligne ne rendaient qu'une clé sur trois — la graisse et l'interlettrage disparaissaient ; (b) `ACCENTS` porte une annotation de type contenant des accolades, donc l'extracteur capturait le TYPE et rendait **zéro accent**. Garde-fou : `lib/__tests__/designSystem.test.ts` (17 tests), vérifié par mutation.
  ➡️ **La moitié d'une DA n'est pas une valeur, c'est une règle** : `principes.html` porte les 8 qui ne se déduisent d'aucune palette (le fond ne bouge jamais · hiérarchie par la TAILLE · un rôle par rayon · trois nuances jamais trois teintes · une nuance pâle se MESURE · pas de flou · 44 pt de cible tactile · les deux thèmes se valent).

- **REFONTE DESIGN — passe 2 : tout le reste (2026-08-03, ✅)** — les 5 onglets étaient refaits, **le reste de l'app ne l'avait jamais été** : login, onboarding, Kyroz+, mentions légales et une vingtaine de feuilles modales n'avaient hérité que des tokens de COULEUR. Or un composant qui hérite d'une couleur garde sa FORME d'avant. **Mesuré en une capture de l'écran Plan** : bandeau de série 22 · bouton « hors plan » 14 · carte Hydratation **16** · bouton « + un verre » **999**. Quatre objets qui se touchent, trois grammaires — et rien de tout ça ne se voit en relisant un diff. ➡️ Le correctif n'est pas la liste des ~40 corrections, c'est d'avoir donné un **RÔLE** à chaque token (`pill` puce · `sm` sous-bloc · `button` bouton ET champ · `card` bloc — le rayon dominant · `xl` surface flottante) et **supprimé `md` (16) et `lg` (20)**, qui n'en avaient aucun : tant qu'ils existaient, écrire `Radius.md` sur une carte était légal, et c'est arrivé huit fois. ⚠️ **Le rayon seul ne suffit pas — la HAUTEUR fait la forme** : « + un verre » passé de 999 à 14 ressemblait *encore* à une lozange, parce qu'à 34 pt de haut 14 de rayon est presque un demi-cercle. C'est la hauteur qui était fausse (34 → **44 pt**, aussi le minimum d'une cible tactile Apple — que `hitSlop` rattrapait au doigt sans jamais le rattraper à l'œil). ⚠️ **Échelle typo alignée sur 700** : `Type.h1` pesait **800**, donc plus lourd que le `display` au-dessus de lui — la hiérarchie s'inversait dès qu'on employait les deux. Personne ne s'en servait, donc l'incohérence dormait *dans le fichier qui sert de référence à toute l'app*. Ajout de `Type.hero` (40/700), qui existait déjà en dur dans `MacroBar` et en **900** dans `WeightSummaryCard`. Autres corrections de fond : bouton secondaire de la fiche recette passé du liseré 1,5 px au **remplissage** (il était l'objet le plus dessiné de l'écran), liserés d'en-tête retirés sur Kyroz+ / mentions légales et sous le pied d'onboarding, curseur du `Segmented` rendu **concentrique** à son rail (il valait 11 pour un cadre à 14). Garde-fou : **`lib/__tests__/rayonsDA.test.ts`**, vérifié par mutation. Vérifié à l'écran en clair ET en sombre.
- **REFONTE DESIGN — passe 3 : le grand titre se replie (2026-08-04, ✅)** — dernier écart avec la maquette, trouvé en RELISANT sa table des matières au lieu de se fier au souvenir : elle a un titre compact (17) dans une barre collée en haut, et un gros titre (34) qui s'en va vers le haut — **sur ses cinq écrans à l'identique**. ⚠️ Le défaut de l'app était pire que « ça manque » : les cinq onglets ne faisaient pas la même chose. Plan et Profil avaient l'en-tête DANS le défilement (le titre partait, rien ne le remplaçait) ; Recettes, Courses et Frigo l'avaient en dehors (le titre de 34 restait planté en haut pour toujours). **Deux comportements opposés pour le même objet.** Mécanique unique `components/CollapsingTitle.tsx` posée sur les cinq ; les écrans à liste passent leur en-tête en `ListHeaderComponent`. ⚠️ **Un ÉLÉMENT, jamais une fonction composant** : sinon l'en-tête remonte à chaque rendu et le champ de recherche des Recettes perd le focus à chaque frappe (vérifié : 6 caractères, focus conservé). ⚠️ **Pas de flou** contrairement à la maquette — `expo-blur` est une dépendance NATIVE (nouveau build, nouvelle revue, voie OTA fermée) et ça ne vaut pas 52 pt de barre. 🔴 **`requestAnimationFrame` ne tourne PAS dans le panneau navigateur — 0 frame en 7,2 s, mesuré.** Toute animation y démarre, rend une frame et se fige à une valeur intermédiaire *plausible* : j'ai « corrigé » un `useNativeDriver` parfaitement sain avant de penser à mesurer l'instrument. La décision est donc une fonction pure testée (`repliTitre.test.ts`), l'écran ne sert qu'au rendu. Ajouté au passage : la note de pied des Courses (« Quantités calculées pour tes repas de la semaine. »), le dernier élément de la maquette qui manquait.
- **Couleur d'accent personnalisable (2026-08-03, `lib/accentColor.ts`)** : six choix — monochrome (**défaut**, = la DA), bleu, vert, orange, rouge, violet — réglés dans Profil → Préférences. Seul l'accent change (boutons, jour actif, pilule sélectionnée, onglet actif) ; **le fond ne bouge jamais**. LOCAL-ONLY comme `themeMode` → **aucune migration**. Câblage quasi gratuit : `t.accent`/`t.onAccent` étaient déjà utilisés **85 fois dans 20 fichiers**, donc changer le token a suffi. ⚠️ `onAccent` se CALCULE (`readableOn`) ; ⚠️ le garde-fou porte sur « l'accent se détache du fond de page » (3:1) et **non** sur la lisibilité du texte — celle-ci ne peut PAS échouer (plancher mathématique 4,61:1 démontré dans le test), un seuil AA y aurait été purement décoratif ; ⚠️ palette **mise en cache** (sinon `useMemo(makeStyles)` invalidé à chaque rendu). Détail et pièges : CLAUDE.md §8.
- **Thème** (`constants/theme.ts`) : adaptatif clair/sombre, accent monochrome par défaut (personnalisable, ci-dessus), pas de couleur en dur (`useTheme()` + `makeStyles(t)`). **Choix manuel Système/Clair/Sombre** : store externe `lib/themeMode.ts` (persisté `@kyroz:theme`, chargé au démarrage dans `_layout`) consommé par `useTheme()` via `useSyncExternalStore` — pas de provider. Réglage exposé dans Profil → section Application. `cardShadow` → `boxShadow` sur web / `shadow*`+`elevation` natif (warnings RN-web nettoyés 2026-06-14, avec `pointerEvents` en style et `TouchableWithoutFeedback`→`Pressable`).
- **Recettes** : **512** *(mesuré le 2026-08-03 : 122 petit-déj + 110 collations + 280 repas complets)* — *(historique : 100, + **164** le 2026-06-19, + **50 sans gluten** le 2026-07-22, puis les vagues B1→B9 de fin juillet / début août. Le chiffre faisant foi est `npm run mesure:couverture`, pas cette ligne.)* ⚠️ **Tout le matériel recettes vit désormais dans `kyroz-app/Recette/`** (2026-07-22) : catalogue LIVE `Recette/recettes-kyroz.json` (l'ancien `lib/data/recettes-kyroz-100.json` est déplacé + renommé — le nom « 100 » mentait ; `lib/data/` supprimé), livraisons brutes archivées dans `Recette/drops/<date>-<sujet>/` (jamais importées par le code), mode d'emploi de la chaîne d'ajout dans `Recette/README.md`. Chaîne : (`Recette/recettes-kyroz.json` → `lib/recipeData.ts` (table d'ingrédients réf + config + macros depuis réf) → `lib/recipeMap.ts` (JSON FR → `Recipe[]` internes) → `lib/recipes.ts` (ré-export `RECIPES` + registre d'overrides inchangé). 122 petit-déj + 110 collations + 280 repas (chacun tagué objectif/sport + `why_fr` + ingrédients `ref`/`macro_role`/`scalable`). `validated_by_dietitian: false`. **`ENGINE_VERSION` = 45** *(valeur faisant foi : `lib/planEngine.ts`, qui porte l'historique complet ; cette ligne a traîné à 25, puis à 38)* (v16 = fix variété ; v17 = fibres sourcées Ciqual ; v18 = 2026-07-23, biais fibres en sèche à la sélection ; … ; **v25 = 2026-07-30, borne basse de l'ancre protéine 1,0 → 0,5**. Toute incrémentation régénère les plans en cache — valeur faisant foi : `lib/planEngine.ts`). **`restrictions_ok` dérivé par ingrédient** (`lib/recipeDiet.ts`, table d'incompatibilités) — autoritaire dans `recipeAllowed`, repli mots-clés pour le legacy. **Régime `vegan` ajouté (2026-06-19)** : `DietaryRestriction` + `VIOLATIONS` (26 refs animaux dont œufs/miel) + blocklist mots-clés ciblée (`planEngine.ts`, sans faux positifs lait d'amande/coco·yaourt soja·beurre végétal) + toggle onboarding/profil. **AUCUNE migration Supabase** (`dietary_restrictions text[]` libre). Couverture vegan (sur 314, mesurée 2026-07-22) : pdej **33**/78 · coll **36**/66 · repas **57**/170. **Macros recettes = SOURCÉES CIQUAL (fusion des deux bases, livrée)** : `lib/recipeFoodMap.ts` lie **99/113** ingrédients `ref` → `food_id` Ciqual (mapping VÉRIFIÉ À LA MAIN, basis cru/sec/cuit respecté — l'auto-matching par nom est piégeux : « maquereau »→« groseille à maquereau »). `recipeData` résout `per100g` depuis la base curée quand mappé. **Composites repris 2026-07-14 (+13)** : `pates_semoule`→9810, `pates_completes`/`nouilles_completes`→9870 (⚠️ PAS 9863 « nouilles asiatiques aux ŒUFS » → fausserait le végétalien), `nouilles_riz`→9900 (corrige la protéine sous-estimée 3→7,4 g), `polenta`→9614, `graines_courge`→**15064** (« Courge, graine, séchée » — le piège butternut), `beurre_amande`→15041, `pesto`→11179, `creme_soja`→11214, `cacao_poudre`→18100, `tomate_concassee`→20169, `raisins`→**13395** (« Raisin cru » — ⚠️ PAS le raisin SEC, 322 vs 71 kcal). Impact mesuré : 74/264 recettes bougent, Δ kcal moyen **1,2 %**, max 2,9 % (affinage, pas distorsion) → `macros_per_serving` du JSON **volontairement NON re-baselinés** (ils servent de repère INDÉPENDANT au garde-fou ; les re-caler le viderait de son sens). ✅ **Légumineuses harmonisées en SEC (2026-06-20)** — l'utilisateur pèse à sec (comme riz/pâtes). `pois_chiches`→`ciqual-20516`, `lentilles_vertes`→`20585`, `haricots_rouges`→`20525` (codes « …, sec », ~314-350 kcal/100 g, `basis=dry`) ; `lentilles_corail` était déjà en sec. Les 5 nouveaux ingrédients mappables le sont aussi (`haricots_blancs`→20501, `feves`→20518, `pois_casses`→20515, `sarrasin`→9380, `chataigne`→15024) ; `soja_texture`/`haricots_noirs`/`millet` restent **manuels** (pas d'entrée Ciqual sèche propre — Ciqual n'a que la PST réhydratée). ⚠️ **Conséquence** : les **anciennes** recettes (les 100) exprimaient leurs légumineuses en poids **CUIT** (100-200 g) → **15 quantités converties cuit→sec** (×~0,4, nutrition préservée) ; les nouvelles étaient déjà en sec (mon recalage « cuit » du 19/06 était donc à l'envers — corrigé). **49 `macros_per_serving` re-baselinés** sur le dérivé. `basis` = métadonnée seule (jamais affichée) ; la pesée à sec suit la convention riz/pâtes (nom sans « sec »). `recipeMap` DÉRIVE `macros_per_portion` des ingrédients résolus (÷ `base_servings`) → plus de double source. Impact mesuré : Δ kcal moyen 3 %, max 11 %, 42/100 recettes inchangées (les estimations étaient déjà bien calées) ; `macros_per_serving` du JSON conservé en garde-fou de régression (±30 %, `recipeMap.test.ts`). **`ENGINE_VERSION` 7** (régénère les plans en cache). **Les 14 `ref` encore manuels le restent À RAISON** (règle : on ne mappe QUE si l'entrée Ciqual est SANS AMBIGUÏTÉ le même aliment) : absents de Ciqual (`cottage_cheese`, `edamame`, `yaourt_soja`, `yaourt_soja_proteine`) · produits Kyroz (`whey`, `skyr`, `proteine_vegetale`) · pas d'entrée SÈCHE propre (`soja_texture`, `haricots_noirs`, `millet` — Ciqual n'a que la FARINE) · produit voisin mais distinct (`levure_maltee` : Ciqual n'a que la levure de BIÈRE) · composites par construction (`fruits_rouges`, `legumes_wok`, `ratatouille`). **Nouveau garde-fou `recipeFoodMap.test.ts` (2026-07-14)** : le garde-fou ±30 % de `recipeMap.test` compare les kcal de la RECETTE ENTIÈRE → il était **AVEUGLE** à un ingrédient dense mais peu pesé (20 g de graines mappées sur du butternut = 618→30 kcal ne bougent pas le total de 30 % ; vérifié : l'ancien test passait). Le nouveau teste chaque ingrédient **à la source** : (1) toute clé mappée existe dans le JSON (attrape la faute de frappe `datte`/`dattes` = mapping mort et silencieux), (2) tout `food_id` résout, (3) écart Ciqual vs estimation manuelle suspect si **> 40 kcal EN ABSOLU *et* > 50 % EN RELATIF** — les deux ensemble, car le relatif seul crie au loup sur les aliments peu caloriques (épinards 23→33 = +43 % mais 10 kcal) et l'absolu seul sur les denses (mozzarella +57 kcal, correction légitime). Reste : approche B « fourchette » de macros (post-tests utilisateurs). Fix `formatQuantity` : « bœuf » contenait « œuf » → était compté en œufs (corrigé + test). **Audit qualité des 264 recettes (workflow multi-agent, 2026-07-14)** — COUPÉ par la limite de session (71/146 agents ; verif 59/112 recettes, synthèse non faite → à re-lancer après reset : `Workflow({scriptPath:'…/audit-recettes-kyroz-wf_b0be652e-fb5.js', resumeFromRunId:'wf_b0be652e-fb5'})`, cache les agents finis). **Corrigé (déterministe, testé)** : (1) `col04` 80 g de dattes > `abs_max_qty` 60 → le moteur servait 60 (fiche≠servi, 57 kcal) → ramené à 60 + test « base ≤ abs_max_qty » ; (2) **3 noms de légumineuses** disaient « cuits/égouttés » alors qu'on pèse SEC (`Pois chiches cuits (égouttés)`→`Pois chiches`, idem lentilles vertes/haricots rouges) → mis au neutre (convention riz/pâtes) + test « pas de nom cuit/égoutté sur basis:dry » ; (3) **23 ingrédients flavor/vegetable marqués `scalable:true`** (miel, cacao, sirop, sauce soja) — INERTE (le moteur les fige déjà, `adaptRecipe` role flavor/vegetable) mais mensonger → passés `false` + test. **CAPTURÉ, non corrigé (contenu → diététicienne / audit à finir)** : ~~⚠️ `rep32` « Cabillaud pané maison » taggée `gluten_free » mais chapelure hors liste~~ **CORRIGÉ 2026-07-16** : nouvel ingrédient `chapelure` (→ `ciqual-7500`, `abs_max_qty` 40) + entrée `VIOLATIONS: ['gluten_free']` dans `recipeDiet.ts` + chapelure 25 g ajoutée à rep32 (`carb`, fixe). Effet : `restrictions_ok` de rep32 = pescatarian/no_pork/lactose_free/halal (**gluten_free tombe tout seul**), macros re-comptées 540→636 kcal (la panure n'était pas comptée). `macros_per_serving` re-calé (l'ancien décrivait le plat SANS panure), `ENGINE_VERSION` 14, test de régression `rep32 pas gluten_free`. **Autres ingrédients-fantômes** (cités dans les instructions, absents de la liste → macros/courses/régime faux) : sauces teriyaki (`rep50/73/147`), miso (`rep47`), sauce soja (`rep05/46/80`), sirop érable (`rep80`) ; houmous (`rep111/118` — ailleurs FAIT à partir des pois chiches listés, faux positif) ; aromates non tracés (ail, curry, citron) = volontaire, PAS un défaut. **Cohérence `why`/tags** (ex. `pd10` « yaourt grec – noix » : `why` vante un « équilibre protéines/lipides » muscu à 10 g P / 28 g L, aucune ancre protéine scalable) → jugement diététicienne.
- **Tests** : **1 432 / 86 fichiers** (mesuré le 2026-08-11 sur `main` FUSIONNÉ `0d91966`, après #92 et #94 ; `tsc --noEmit` OK). Historique : 1 429 / 86 fichiers (`npm test`, vitest ; tsc `--noEmit` OK — **mesuré le 2026-08-11 sur l'arbre FUSIONNÉ : notifications (E38) + matériaux (E36) + haptique (E37), au dernier commit avant le merge.** Les trois branches annonçaient 1 413 / 84, 1 403 / 85 et 1 411 / 86 ; aucune n'était vraie après fusion, et c'est sur cette ligne que git a levé un conflit à chacune des deux fusions. Historique : 1 395 / 84, mesuré le 2026-08-10 au dernier commit avant le merge d'E35 (le mouvement), sur la branche rebasée sur `origin/main`.** Nouveau fichier : `mouvementDA.test.ts` — aucune durée en dur, aucune `Animated.timing` sans courbe, aucun `bounciness`/`speed`/`tension`/`friction`, plus les propriétés des décisions du geste (un geste vif porte plus loin qu'un mou ; la feuille se décide sur la PROJECTION ; le bord résiste sans jamais rendre la main). **Vérifié par 3 mutations.** ⚠️ Et sa première version MENTAIT dans le sens alarmant — son expression régulière s'arrêtait au premier `)`, donc elle accusait 10 fichiers de n'avoir aucune courbe alors qu'ils en ont une. Historique : 1 378 / 83 — **mesuré le 2026-08-10 sur la branche E33/E34 REBASÉE sur `origin/main` (`bf5ecac`), après le merge de #74 ; sur `main` seul : 1 367 / 82.** Nouveau fichier : `profilSection.test.ts` (11 cas, **9 mutations** — le rangement de l'onglet Profil : le mot « Réglages » ne désigne qu'un endroit, aucune route poussée par deux lignes, les étapes du tour suivent l'écran, « Régénérer » est un bouton et non un réglage, le poids n'a qu'une porte d'entrée). ⚠️ **Et ce compte a été re-mesuré DEUX fois dans la même session** : 1 337 puis 1 340, tous deux justes chez leur auteur et faux dès la fusion suivante — exactement le défaut structurel décrit plus bas, rejoué le jour même où il est écrit. Historique : mesuré le 2026-08-10 sur `main` FUSIONNÉ (`25275fe`), après le merge de #69 : 1 329 / 79.** Nouveau fichier : `feedback.test.ts` (9 tests — le canal de retour, dont le « & » qui tronquerait un message en silence). Écrit dans le même commit que la ligne « Tests » du tableau de tête, comme la règle ci-dessous l'exige — et pour la raison qu'elle donne : les deux avaient été écrites à 1 318, mesuré sur #65 avant que #66 ne fusionne.) Nouveau fichier du 2026-08-09 : **`emojiInterface.test.ts`** — la règle « aucun émoji dans l'interface » (CLAUDE.md §8) est enfin COMPTÉE, sur **cinq** dossiers et non deux : `app`, `components`, **`lib`, `constants`, `hooks`**. Se limiter à ce qui RESSEMBLE à de l'interface est l'erreur exacte qui avait laissé 13 émojis affichés depuis `lib/streak.ts` et `constants/legal.ts` pendant que trois copies d'un « plus un seul émoji » se confirmaient l'une l'autre. Il écarte les commentaires **de fin de ligne** (la méthode citée jusqu'ici dans §8 rend 58 occurrences contre 11 : l'écart est fait des ⚠️ posés après du code, et un compteur qui crie au loup 47 fois n'est pas lu), autorise `®`/`©`/`™` — typographiques, ils suivent la fonte donc le thème, ce qui est le critère même qui condamne les émojis — et **vérifie qu'il sait dire OUI** avant de dire non. Vérifié par 3 mutations. (Les deux emplacements sont écrits dans le MÊME commit, comme la règle ci-dessous l'exige.) Ce qui suit est l'historique du 2026-08-08. **mesuré le 2026-08-08 sur `origin/main` (`5fbe8e2`) PLUS cette PR (E21) — sur `main` seul : 1 281 / 75. Après le tuto (#44), la confirmation e-mail (#41), le mot de passe oublié (#43) et A28. ⚠️ **Et cette ligne annonçait encore 1 241 pendant que le tableau de tête disait 1 248** — la divergence que le paragraphe ci-dessous décrit, rejouée le lendemain de son écriture. Les deux sont désormais au même chiffre, mesuré sur le même arbre, dans le même commit. ⚠️ **1 241 + 12 (`visiteGuidee.test.ts`) ne fait pas 1 248** : le compte ne s'additionne pas, il se re-mesure — plusieurs PR ont fusionné entre-temps. ⚠️ **Les deux emplacements avaient re-divergé, et pour la raison exacte que ce paragraphe décrit** : le tableau de tête portait 1 197/72 (mesuré sur un arbre qui ne contenait PAS la PR #45) et cette ligne 1 177/71 (mesuré sur la branche #45 seule). Aucun des deux n'était faux **chez son auteur** — et aucun n'était vrai après fusion. C'est structurel, pas de la négligence : en sessions parallèles, tout compteur mesuré avant fusion périme au merge suivant. ➡️ **Le mesurer sur `origin/main` fusionné, et écrire les DEUX emplacements dans le même commit.** ; 1 145 / 70 le 2026-08-06 sur l'arbre FUSIONNÉ, TROISIÈME fusion du jour ; cf. E15. Le compte a valu 1 055, 1 018, 1 058 et 1 056 selon la branche, et **aucun n'était vrai après fusion** — c'est pour ça qu'on le RE-MESURE au lieu de recopier celui d'en face). Nouveau fichier du 2026-08-08 : **`visiteGuidee.test.ts`** (12 tests, **5 mutations** ; cf. E20) — il vérifie surtout qu'**aucune étape de tour ne vise une cible ABSENTE du code**, parce que `startTour` écarte silencieusement les étapes non montées : un id mal orthographié fait disparaître une bulle sans rien casser, et le tour se joue plus court en ayant l'air complet. Plus : tours non vides, ids uniques, bornes de rédaction, aucun émoji, aucun ton de reproche (§10), table `TOURS` ↔ écrans **dans les deux sens**. ⚠️ Le repli `?? []` vient d'une mutation : sans lui, un tour inconnu cassait l'IMPORT du fichier et vitest affichait « **no tests** » — ce qui se lit comme « rien à vérifier », pas comme un échec. ⚠️ Ce qu'il ne sait PAS faire, et c'est écrit dedans : juger qu'une phrase est VRAIE. Aucun test ne le peut ; c'est pour ça que chaque étape de `lib/tours.ts` porte en commentaire le chemin de code qui la prouve. Nouveau fichier du 2026-08-07 : **`reminder.test.ts`** (heure LIBRE du rappel quotidien + rotation des messages : reprise de l'ancien format `morning|midday|evening` — sans elle le rappel de tous les réglages existants s'éteignait en silence —, aller-retour de stockage sur les 24 h, bornage de la saisie, les 24 heures tombent dans le bon créneau de journée (la nuit finit la veille), deux jours d'affilée ne redonnent jamais le même message, et **les règles d'écriture sont COMPTÉES** : aucun émoji, aucun mot qui culpabilise, corps qui tient dans une bannière. Vérifié PAR MUTATION — 4 tests rougissent sur les 3 défauts visés. ⚠️ **Deux de ces tests ont rougi POUR DE VRAI en écrivant les citations**, et aucun des deux défauts n'était visible dans le diff : (1) retirer UNE citation trop longue a fait tomber le cycle titre×citation de 48 à 15 jours, parce que 15 est divisible par 3 titres — **les deux compteurs doivent rester premiers entre eux** ; (2) le plafond de 140 caractères a désigné une citation de Sénèque à 141 — elle a été RETIRÉE, pas rognée, et le plafond n'a pas bougé (tronquer une citation d'auteur, c'est lui faire dire autre chose). ⚠️ Le test « aucun message ne met la pression » a rougi POUR DE VRAI à l'écriture, sur « Rien n'est perdu » : une phrase qui se voulait rassurante nomme quand même la perte. Reformulée.). Nouveaux fichiers du 2026-08-06 (moteur & feuilles) : **`volumeConcentre.test.ts`** (le budget du jour suit la dépense du jour : l'énergie disponible VÉCUE rejoint celle qu'on annonce, la SEMAINE garde son total, aucune répartition inventée sans sport déclaré, le PLAN servi suit — et « pas répondu » ne vaut pas « aucun jour de repos » ; vérifié par mutation ; cf. E16/E17) · **`feuilles.test.ts`** (les DEUX pannes des feuilles modales : geste tué par un `false` constant au contact, et démontage conditionné à une animation qui va au bout — les deux vérifiées par mutation ; cf. E12/E18). Nouveaux fichiers de la passe DA (2026-08-05/06, fusionnés le 2026-08-06) : **`typoDA.test.ts`** (une taille de texte en chiffre n'est légitime que sur un pictogramme ; graisses limitées à 500/700 ; `Type.input` ≥ 16 — vérifié par 5 mutations) · **`espacementDA.test.ts`** (aucun espacement en chiffre hors 0 ; grille multiple de 4, croissante, sans doublon ; aucun pressable sous 44 pt — 5 mutations) · **`finitionsDA.test.ts`** (retour au toucher, épaisseur de trait et taille d'icône passent par un token — 6 mutations). Nouveaux fichiers du 2026-08-06 (passe 4) : **`designSystem.test.ts`** (l'extraction du miroir de DA trouve chaque bloc ET le rend non vide — vérifié PAR MUTATION : remettre la panne `ACCENTS` fait rougir 4 tests) ; `accentColor.test.ts` gagne les nuances de macro et leur plancher de contraste. Nouveau fichier du 2026-08-06 : **`noClientAiKey.test.ts`** (aucune clé d'IA lisible côté client — la règle de CLAUDE.md §2 était écrite mais pas comptée ; vérifié PAR MUTATION, il désigne le fichier fautif par son nom). Nouveaux fichiers du 2026-08-05 : **`harnaisEcrans.test.ts`** (les 40 ancres dont les scripts Playwright dépendent — libellés, placeholders, clés AsyncStorage, `TABS`/`GOAL_SUB`/`TOTAL_STEPS` — sont verrouillées contre les écrans, des DEUX côtés ; vérifié par mutation en rejouant les deux pannes réelles dans l'app) · **`offPlanJournal.test.ts`** (journal des écarts hors plan : remplacement par couple date+jour, décision inconnue qui se TAIT, résumé sans compteur — les trois vérifiés PAR MUTATION ; cf. E6). ⚠️ **Ce compte vit à DEUX endroits** — ici et dans le tableau de tête — et les deux ont divergé le 2026-08-03 (982/56 ici contre 985/57 là-haut, deux sessions ayant livré en parallèle). **Les mettre à jour ENSEMBLE**, ou n'en garder qu'un. Nouveaux fichiers du 2026-08-03 : **`rayonsDA.test.ts`** (un `borderRadius` en chiffre n'est légitime que sur un objet de taille fixe — vérifié par mutation) · **`goalLadder.test.ts` (les échéances proposées sont toutes TENABLES et toutes DISTINCTES ; l'ensemble tenable n'a pas de trou, ce qui fonde la dichotomie ; cf. A27 — les deux invariants ont été vérifiés PAR MUTATION, chacun rougit sur le défaut qu'il vise)**. Nouveaux fichiers du 2026-08-02 : `boot.test.ts` (le démarrage ne dépend plus du réseau), `noAlert.test.ts` (interdit `Alert`, no-op sur le web), `birthday.test.ts` (âge dérivé de la date de naissance, 29 février compris), **`reroll.test.ts` (« Régénérer mon plan » doit se VOIR — renouvellement ET non-répétition ; cf. A21)**, **`planSeed.test.ts` (le tirage choisi se GARDE au changement de réglage ; cf. A24)**, **`carryTracking.test.ts` (ce qui a été mangé survit à une régénération ; cf. A26)**. ⚠️ Ce compte a traîné à « 403 / 26 » puis « 413 » pendant plusieurs semaines : **le mettre à jour fait partie de la livraison**, sinon il devient un troisième chiffre à ne pas croire. Détail : comptage recettes **512** (`recipeMap.test.ts`, chiffre à bouger à chaque vague), **variété intra-semaine (`variety.test.ts` ; P3.5)**, **fibres sourcées Ciqual par ref/food_id + « aucune recette à 0 g » (`fiber.test.ts` ; P3.1)**, **jours de repos choisis (`rest_weekdays` : mapping weekday→index, `[]`=aucun, jour hors-plan ignoré, signature ; `planEngine.test.ts`)**, régime vegan + **halal (porc/charcuterie → `restrictions_ok`, repli blocklist ; `recipeDiet.test.ts` + `planEngine.test.ts`)** (refs animaux → restrictions_ok, blocklist), garde-fous §6, masse maigre, mode percent, fuseau, déterminisme, recalage du jour, fibres, courses→frigo, **liste de courses moins le frigo** (`shoppingList.test.ts`), units (régression bœuf), refonte recettes : `recipeData`/`recipeMap` (intégrité 512, refs valides, macros ±2 %, restrictions_ok, `base_servings===1`), `adaptRecipe` (cible en grammes, **plancher protéique TOTAL** sur recette multi-source, légumes fixes, flags + `FLAG_AUDIENCE`/`gap`, repli si UN ingrédient sans ref), moteur via adaptRecipe (cible jour ±12 %, swap/rebalance/mealIngredients, **`reAdaptMealRecipe`**), **+ stress-test 20 profils (`multiProfile.test.ts`, 10 H + 10 F, gabarits/objectifs/sports/régimes variés)** : invariants garde-fous + macros↔kcal, **bande cible ASYMÉTRIQUE conjointe B+A2 — côté dangereux ≤ `max(15 % du delta TDEE−cible, 90 kcal)` ET protéines ≥ plancher** (remplace l'ancien ±15 % symétrique, trop lâche en sèche), gras ≤50 %, déterminisme, régime respecté/relaxed, courses = Σ ingrédients adaptés, swap conforme au régime. **+ `syncGuard.test.ts`** (décision d'hydratation anti-écrasement C) **+ `goalDirection` / fit asymétrique / `reAdaptMealRecipe` / carb-cycling** (`planEngine.test.ts`). Empirique (après A2) : **écart kcal max 3,8 %** (côté dangereux référencé au delta), protéines 100–118 %, gras 24–29 %. **+ bouclier de série (`advanceStreak` : gel d'1 jour manqué / reset / recharge à 7j / profil legacy ; `streak.test.ts`, 2026-06-20)**. **Error Boundary** global (`app/_layout.tsx`). **Vérif preview e2e 2026-06-17** : génération plan + fiche adaptée + flux override→courses + Tout cocher/Réinitialiser→frigo.
- **QA E2E Playwright** (`@playwright/test` devDep) : scripts dans `test/` (`walkthrough*.mjs` = parcours headed + vidéo ; `qa-full/qa-deep/qa-settings.mjs` = couverture login+onglets+réglages ; `qa/verify-*.mjs` = non-régression). Web RN garde tous les onglets montés dans le DOM → se fier aux **captures**, pas au dump texte. **Login automatisable** via le bouton **« Continuer en invité »** (connexion anonyme Supabase, `signInGuest` / `testID="guest-login"`) → un seul tap, pas de mot de passe. ⚠️ Nécessite l'**auth anonyme activée** dans Supabase (Authentication → Providers → Anonymous). ⚠️ **Masqué en PROD** (`{__DEV__ && …}` dans `login.tsx`, décidé à l'audit sécu pour fermer le vecteur de création anonyme de comptes en masse) — visible seulement en dev/Playwright, invisible sur le web déployé. La QA tourne en dev → OK. (Clé Cloudflare Turnstile créée mais **CAPTCHA non activé** : l'inscription email est déjà protégée par la confirmation email ; Turnstile gardé pour le mobile natif futur.) Repli legacy : session manuelle réutilisée via `test/qa/session.json` (gitignored). Sorties générées (PNG, rapports, vidéos) gitignored. ⚠️ **Ces scripts pilotent l'app par ce qu'elle AFFICHE, donc ils périment quand un écran change** — deux fois déjà, en silence. Depuis le 2026-08-05 : les libellés sont verrouillés par `lib/__tests__/harnaisEcrans.test.ts` (un renommage rougit dans `npm test`), et une étape qui n'aboutit pas nomme la marche cassée avec une capture au lieu de conclure « écran introuvable ». Détail plus bas, « Parcours Playwright ».

- **REFONTE DESIGN — passe 4 : l'échelle typographique POSÉE, 333 sites migrés (2026-08-05, ✅)** — les rayons avaient un garde-fou depuis la passe 2 ; **la typographie n'en avait aucun**, et c'est exactement là qu'elle a dérivé. Comptage : `Type` déclarait **8 tailles**, l'app en employait **18** ; 2 graisses déclarées, **6** employées ; trois sites écrivaient un **demi-pixel** (`fontSize: 11.5`, `12.5`). ⚠️ **Les deux tailles les plus courues de toute l'app n'existaient dans AUCUN token** : 14 (76 fois) et 12 (48 fois) — et la table qui sert de référence ne les mentionnait nulle part. 12/13/14/15 cohabitaient : quatre « petits textes » à un pixel d'écart, ce qui ne fait pas quatre niveaux de lecture mais **un flou**. ➡️ **La graisse 600 est BANNIE** (72 emplois) : mesurée, elle se répartissait au hasard sur les six tailles, donc elle ne marquait rien — c'était la trace de « je veux que ça ressorte un peu ». Échelle finale : **16 crans, chacun avec au moins 4 usages réels** — aucun token spéculatif ; `micro` (11) et `bodySmall` (14) sont nés du comptage, pas d'une intuition. 🔴 **`Type.input` ne descend jamais sous 16** : Safari iOS **zoome de force** sous ce seuil et les testeurs ouvrent Kyroz dans le navigateur de leur téléphone. Les 7 champs respectaient ce plancher **par accident** — sauf `RecipeEditor.input`, à 15, que le premier comptage avait raté (son style tient sur trois lignes). ⚠️ **Un style recopié partout est un rôle sans nom** : le `disclaimer` (11 / interligne 16 / centré) était dupliqué **à l'identique dans 7 fichiers** — sept occasions qu'une seule dérive, sur la phrase la plus sensible de l'app → `Disclaimer` dans `theme.ts`. Même histoire pour le sur-titre : `SectionLabel` existait et servait **45 fois** pendant que 5 fichiers le refaisaient à la main avec 4 interlettrages différents (0,4 · 0,5 · 0,6 · 1). Garde-fou **`typoDA.test.ts`**, vérifié par **5 mutations** (taille en dur, graisse 600, token hors échelle, `input` sous 16, cran sans token) — les 5 rougissent. 🔴 **Piège qui a coûté le plus cher : depuis un worktree, le preview sert l'app du dépôt PRINCIPAL** (`node_modules` est un lien symbolique, expo-router résout la racine à travers lui). Après migration, le navigateur affichait encore **au pixel près la version d'avant** — et l'écran était *plausible*, pas cassé. Deux indices : `--clear` n'y change rien, et le rendu correspond exactement à `git show HEAD:<fichier>`. ➡️ `EXPO_ROUTER_APP_ROOT=$PWD/app`. **Trouvé au passage, hors design** : le harness de captures store (`test/_harness.mjs`) était périmé sur DEUX points — l'attestation de dépistage n'apparaît qu'après avoir répondu aux deux questions, et l'âge ne se saisit plus (c'est une date de naissance en trois champs). Résultat : `bootToPlan` échouait, et le script **annonçait** « plan non généré » puis **écrasait quand même les PNG du store**. Réparé ; les 5 captures se regénèrent.

- **REFONTE DESIGN — passe 5 : l'espacement et les cibles tactiles (2026-08-06, ✅)** — troisième axe de la DA à recevoir un rôle et un garde-fou, après la forme (passe 2) et le texte (passe 4), et **le plus dérivé des trois** : **520 espacements écrits à la main pour 49 usages de `Spacing`** — dix marges en dur pour une seule qui passait par le token — dont **231 hors grille**, la plus courue étant `10` (70 fois), devant `14` (53), `6` (39), `2` (39). ⚠️ **Ce n'est pas une question de joliesse** : le blanc est le seul outil qui dit au lecteur ce qui va ensemble, et l'œil fait ce regroupement AVANT de lire. Mesuré : les cinq écarts verticaux empilés dans `MealCard` valaient **7, 6, 10, 6, 14** — quatre informations flottant à des distances presque identiques, donc rien ne disait où finissait le bloc. Le coût n'est pas « moins joli », c'est **plus lent à comprendre**. ➡️ **Les hors-grille ont été ABSORBÉES, pas adoptées, et c'est la différence avec la typo** : là-bas 14 avait un rôle propre et a mérité son token ; ici 10 n'est pas « un cran entre 8 et 12 », c'est « un peu plus que 8 » — deux points passent sous le seuil de perception, donc un tel cran ne crée aucun niveau de lecture, il DILUE ceux qui existent. Règle : le cran le plus proche, on monte à égalité (2→4, 6→8, 10→12, 14→16, 18→20). ⚠️ **Tout ce qui s'écrit en points n'est pas un espacement**, et les confondre a produit les défauts les plus concrets : (1) les **dégagements de bas** (120 sous une liste d'onglet, 60 en bas d'écran plein, 40 pour le menton d'une feuille) compensent quelque chose de PHYSIQUE → objet `Fond`, nommé d'après ce qu'il dégage ; (2) le `paddingVertical` d'un bouton ne règle pas un écart mais fabrique une **HAUTEUR** → c'est de là que venaient **17 éléments pressables sous les 44 pt d'Apple**, dont un « Annuler » à **29 pt**. Correctif : `minHeight: CIBLE_TACTILE_MIN`, PAS un padding gonflé — le padding règle l'air, la hauteur minimale garantit la cible. ⚠️ `hitSlop` élargit la zone **au doigt, jamais à l'œil** ; (3) les **rattrapages négatifs** (`marginTop: -8`, 22 sites) sont tous des textes d'aide qui annulent le `gap` de leur conteneur — alignés sur la grille, mais ils **restent le symptôme** d'un espacement uniforme là où il faudrait des groupes (correction structurelle, pas un token : non faite). Garde-fou **`espacementDA.test.ts`**, vérifié par **5 mutations** (espacement en dur, cran hors grille, deux crans de même valeur, dégagement renommé, pressable sous 44 pt) — les 5 rougissent. ⚠️ Au passage, `rayonsDA` a rougi sur `borderRadius: 22` posé par CE chantier : la bonne écriture d'un bouton rond est `Radius.pill`, pas la moitié de sa taille. Vérifié à l'écran sur les 5 onglets.

- **REFONTE DESIGN — passe 6 : les trois finitions (2026-08-06, ✅)** — même diagnostic que les trois passes précédentes, en plus petit. `activeOpacity` employait **QUATRE valeurs pour un seul geste** (0,85 ×31 · 0,7 ×23 · 0,8 ×14 · 0,6 ×1), sans qu'aucune ne corresponde à un type d'élément : c'était l'humeur de qui écrivait la ligne. → `OPACITE_PRESSION` = **0,7**, et pas 0,85 : à 15 % d'écart sur fond sombre le retour est presque invisible, or c'est le SEUL signe que l'appui a été pris en compte. `borderWidth` : 1 (×40), 2 (×5), 1,5 (×4) → **deux rôles** (`Trait.fin` séparateur · `Trait.controle` case à cocher, pastille, option retenue) ; le 1,5 n'avait aucun rôle, il était « un peu plus épais qu'un séparateur ». Taille d'icône : **12 valeurs de 14 à 30** → 5 crans. ⚠️ **Une icône n'a pas de taille « à elle », elle en a une par rapport à ce qu'elle accompagne** — d'où `petite` / `standard` / `action` / `nav` / `vide` et pas `sm/md/lg`, qui n'auraient rien dit de plus que le chiffre remplacé. Garde-fou **`finitionsDA.test.ts`**, 6 mutations. ⚠️ **Piège d'écriture** : le regex `borderWidth:\s*(1|1\.5|2)\b` matche `1` dans `1.5` et laisse `.5` — quatre fichiers sont sortis avec `Trait.fin.5`, rattrapés par `tsc`. Mettre la valeur la plus longue en tête d'alternance. 🔴 **NON FAIT, volontairement** : les 110 `lineHeight` en dur. Les porter dans les tokens `Type` s'appliquerait aussi aux textes d'UNE ligne, dont ça change la hauteur de boîte donc l'alignement — un risque invisible sur les 5 onglets et bien réel sur les ~25 feuilles modales, qu'aucune capture ne couvre. Chantier à part, avec sa vérification à lui.

- 📋 **DESIGN — ce qui RESTE, mesuré le 2026-08-06 (pas une impression, un comptage).**
  Les quatre axes qui portent un garde-fou sont clos : couleur (1 seul littéral, les
  confettis d'anniversaire — légitime), rayon (`rayonsDA`), typographie (`typoDA`),
  espacement + cible tactile (`espacementDA`), finitions trait/icône/toucher
  (`finitionsDA`). Restent **deux chantiers, et le second conditionne le premier** :
  - 🔴 **Les 114 `lineHeight` en dur.** Le geste évident — les porter dans les tokens
    `Type` — a un effet de bord qui n'est PAS évident : un `lineHeight` posé sur
    `Type.body` s'applique aussi aux textes d'**UNE seule ligne**, dont il change la
    hauteur de boîte, donc l'alignement. ⚠️ Ce risque est **invisible là où on sait
    regarder** : les 5 onglets se capturent (`npm run store:assets`), les feuilles
    modales non. Ne pas lancer ce chantier sans sa vérification à lui.
  - 🔴 **Les écrans jamais VUS rendus** : `app/kyroz-plus.tsx`, `app/legal.tsx` et les
    **9 feuilles / éditeurs** (`*Sheet.tsx`, `*Editor.tsx`, `*Checkin.tsx`). Ils ont reçu
    les tokens des six passes, mais aucune capture ne les couvre — le harness s'arrête
    aux 5 onglets. ⚠️ **« Les tokens sont passés » ne veut pas dire « l'écran est juste »**
    : c'est exactement l'erreur de la passe 1, où des composants avaient hérité de la
    bonne palette et gardé la géométrie d'avant.
  ➡️ Ordre : **voir d'abord, migrer ensuite.** Étendre le harness à ces écrans donne à la
  fois la vérification qui manque et le filet du chantier `lineHeight`.


## État de `lib/sync.ts` — sous filet depuis le 2026-07-30

Le module qui peut faire perdre des données à un utilisateur avait **0 test** sur 259 lignes.

- **`lib/__tests__/profileCols.test.ts`** — VERROU : `PROFILE_COLS` comparé au schéma SQL réel
  du dépôt. Toute colonne ajoutée au schéma fait échouer la suite jusqu'à ce que quelqu'un
  tranche entre « synchronisée » et « exclue, pour telle raison ». Ferme le mode de panne
  « migration non jouée → synchro morte en silence », survenu **trois fois**. Verrou explicite
  sur `consent_health_data`/`consent_at` (portée juridique, cf. `CLAUDE.md` §7).
- **`lib/__tests__/sync.test.ts`** — 57 tests de CARACTÉRISATION. Décrivent l'existant.
  Les **6 marqueurs `// SUSPECT:` ont tous été résolus le 2026-07-30** : il n'en reste aucun.
  ⚠️ Un test d'ici qui rougit n'est donc plus ambigu — c'est une régression.
- **`lib/__tests__/syncSignal.test.ts`** — 33 tests : l'échec est-il audible, et le flux de
  contrôle est-il resté identique.
- **Le retry de `pushProfile` est CONDITIONNEL** (2026-07-30) : il ne se déclenche plus que
  sur « colonne inconnue côté serveur » (`unknownColumnOf`). Il était inconditionnel, donc une
  panne réseau ou un refus RLS déclenchait un second appel voué au même échec — et le mot
  « retry » ne voulait plus rien dire. Valeur de retour et drapeau « sale » **inchangés** dans
  les deux cas (testé) : ce qui disparaît, c'est un appel réseau inutile.
- **Le signal** (`sync.ts::warnSyncFailure`) : les échecs de push étaient totalement muets
  (aucun `console` dans le dépôt). Ils nomment maintenant le domaine, et **isolent** le cas
  « colonne inconnue côté serveur » (`PGRST204`/`42703`) des autres erreurs — il signifie
  « migration non jouée en production », pas « hoquet réseau ». Best-effort inchangé : aucune
  valeur de retour ni flux modifié, aucun retry ajouté. Chemin normal = **silence**.

**Les 6 `// SUSPECT:` de la caractérisation sont tous RÉSOLUS (2026-07-30)** et leurs tests
sont devenus des non-régressions. Les trois derniers, corrigés après les fusions :

| Défaut | Correctif |
|---|---|
| `pushFavorites` : `delete` puis `insert` = fenêtre de perte si l'insert échoue | **Ordre inversé** : `upsert` (clé primaire `(user_id, recipe_id)`, aucune migration) puis `delete` de ce qui n'est plus favori. La liste cloud n'est jamais vide ; un échec ne coûte au pire qu'un favori en trop |
| `deleteCloudData` : un échec laissait les tables suivantes NON tentées | **Un try/catch par table** : les 6 sont toujours tentées, et un récapitulatif nomme celles qui ont résisté (`n/6`) |
| `pull_cloud` effaçait les champs local-only du profil | **`localOnlyProfileFields`** : les champs hors `PROFILE_COLS` survivent, le cloud restant maître de toutes les colonnes qu'il porte. Sauve `is_post_menopausal`, qui pilote le plancher d'énergie des femmes non ménopausées |
| Écriture partielle (retry réussi) : profil déclaré « propre » | **Il reste « à pousser »** et `pushProfile` renvoie `false` : la protection anti-écrasement est conservée, le push se retente jusqu'à ce que la migration soit jouée |

Reste volontairement en l'état : l'écrasement des favoris et du garde-manger (chantier 5 —
c'est une décision, pas un défaut).

## Conformité RGPD
- **Fait (code)** : consentement explicite horodaté à l'inscription ; droit à l'effacement (compte + cascade + purge locale à la déconnexion ET suppression) ; **droit à la portabilité** (export JSON, `lib/exportData.ts`) ; **politique de confidentialité + CGU** (`constants/legal.ts` → écran in-app `/legal` + page statique 200 `public/legal.html` pour stores/partage, liés login + profil) ; isolation RLS (vérifiée en prod) ; aucun SDK tiers de tracking (partage IA Supabase = Disabled ; la mesure d'audience du traitement n°2 est un client écrit à la main, inerte sans consentement et sans clé) ; photos local-only. **Registre** : `kyroz-app/RGPD-REGISTRE.md`. Coordonnées : Kévin Berger, micro-entreprise, 2 rue du moulin 64570 Arette, `contact@kyroz.app`.
- **Fait (fondateur, hors code) — 2026-06-15/16** : DPA Supabase signé (données de santé déclarées, rôle Controller) ; région UE confirmée (`eu-central-1` Frankfurt) ; 2FA activée ; e-mail unifié sur l'adresse publique unique `contact@kyroz.app` (+ perso `brgkevin@kyroz.app`), en cours de migration Cloudflare Email Routing → iCloud+ Domaine perso (2026-07-15).
- ~~**Reste** : renseigner le SIREN~~ **FAIT 2026-07-16** : SIREN `106386162` (Luhn OK) renseigné dans `constants/legal.ts` (objet `LEGAL`), `public/legal.html` (miroir) et `RGPD-REGISTRE.md`. Reste : relecture juriste idéale (non bloquante). Cf. [[rgpd-placeholders-a-completer]].
- **Analytics — arbitré le 2026-08-10** (E26, `docs/2026-08-10-synthese-analytics-arbitrage.md`) : consentement pour TOUT (l'exemption CNIL « mesure d'audience » est écartée, elle exige des stats anonymes) ; identifiant **pseudonyme et non anonyme** — c'est ce qui rend possible la suppression sur retrait, et les deux promesses ne peuvent pas tenir ensemble ; conservation **18 mois** ; jamais d'`identify`/`alias` vers l'id Supabase. ⚠️ Les métriques se lisent en **appareils**, jamais en personnes (réinstaller tire un nouvel identifiant) — le biais est structurel, il doit être nommé partout où un chiffre est cité. La relecture juriste porte désormais aussi sur : formulation de l'écran de consentement, qualification pseudonyme, 18 mois, suppression sur retrait.

## Setup & déploiement
- Expo Router (file-based), SDK 56, TS strict. Lancer : `npm run web` (8081) / `npm run ios`. Tests : `npm test` (vitest). Preview agent : port **8090** (pas 8081, occupé par le fondateur).
- **En ligne** : web sur GitHub Pages → https://brgkevin-arch.github.io/Kyroz-app/ (repo public `brgkevin-arch/Kyroz-app`, auto-deploy `deploy.yml` à chaque push `main`). Le fondateur publie via **GitHub Desktop** (Commit→Push), pas le terminal.
- ⚠️ **PUBLIER = POUSSER SUR `main`. Rien d'autre.** GitHub Pages sert l'**artefact du workflow** (`build_type: "workflow"`), pas une branche. Deux conséquences : (1) la branche **`origin/gh-pages` est MORTE** — vestige de l'ancien flux, figée au 2026-07-03 ; lire sa date pour juger la fraîcheur du site est un piège avéré (cf. A12) ; (2) **`npm run deploy` (`gh-pages -d dist`) ne publie RIEN** — il pousse sur cette branche morte. Vérifier un déploiement : `gh run list --workflow=deploy.yml`. ⚠️ Le hash du bundle ne prouve PAS qui a déployé : `expo export` est déterministe, build local et build CI donnent le même nom de fichier.
- ⚠️ **Pièges déploiement** : `baseUrl` DOIT rester dans `app.json > expo.experiments.baseUrl="/Kyroz-app"` (sinon page blanche). Jamais « Re-run all jobs » sur un vieux run (redeploie une version périmée) → forcer via Actions → Run workflow. La page est forcée en `lang="fr"` + `notranslate` par un `sed` dans `deploy.yml` (sinon les navigateurs traduisent les faux-amis : « pain »→« douleur »).
- ~~**Export web = SPA**~~ **PLUS VRAI depuis le 2026-08-04 : `web.output: "static"`, chaque route est pré-rendue et GitHub Pages répond 200** (E7). `deploy.yml` copie toujours `index.html → 404.html`, mais le repli ne sert plus qu'aux URL réellement inconnues.
  🔎 **Cette ligne disait « ⚠️ NE PAS tenter `web.output: "static"` : casse le build (le client Supabase référence `window` au pré-rendu Node → `ReferenceError`). Testé et abandonné (2026-06-16). »** Le diagnostic était **exact** — c'est bien le client Supabase, et l'erreur est mot pour mot celle-là. La conclusion, elle, était trop large : la cause était nommée, donc réparable, et elle l'a été en une quinzaine de lignes (`lib/prerender.ts`). ➡️ **Une tentative abandonnée doit consigner la CAUSE, pas seulement le verdict** — sinon elle ferme une porte qui n'était que verrouillée, et personne ne la rouvre. Ici, deux mois.
- ⚠️ **Garde d'auth : il y en a DEUX, garder les deux synchronisés** (`app/index.tsx` ET `app/(tabs)/_layout.tsx`). On n'arrive PAS toujours par `/` : un raccourci d'écran d'accueil iOS, un deep link ou un lien partagé ouvre **directement une tab** (`/profil`, `/plan`…). Avant le 2026-07-21, seul `index.tsx` gardait → l'entrée directe court-circuitait tout, et `profil.tsx` (`if (!profile) return null`) rendait une **PAGE BLANCHE avec juste la barre d'onglets** (constaté sur iPhone par le fondateur ; reproduit à l'identique en preview). Fix : même garde (`!ready||loading` → `<Splash/>` · `!session` → login · `!profile` → onboarding) dans `(tabs)/_layout.tsx`, ce qui couvre les 5 onglets d'un coup. Splash factorisé dans `components/Splash.tsx` (les 2 points d'entrée doivent afficher le MÊME écran, sinon flash). ⚠️ Pas d'Error Boundary à blâmer dans ce genre de symptôme : un vrai crash afficherait le fallback — **un écran blanc = un `return null`, pas une exception**.
- **Page légale statique** : `kyroz-app/public/legal.html` (miroir de `constants/legal.ts`) est copiée par expo à la racine de `dist/` → servie en **HTTP 200** à `…/Kyroz-app/legal.html`. C'est l'**URL de politique de confidentialité** pour les stores / le partage (l'écran in-app `/legal` reste pour les utilisateurs de l'app). Garder les deux synchronisés.

---

# 📚 JOURNAL — ce qui a été livré

## Parcours Playwright — remis d'aplomb le 2026-07-30

Les 7 scripts de `test/` étaient **tous cassés** depuis mi-juin et personne ne l'avait vu :
chacun recopiait les mêmes faits volatils. Ils partagent désormais `test/_harness.mjs`, et
aucun script appelant ne contient plus de chemin, de port ni de libellé d'écran.

Ce qui les avait tués, au-delà du chemin `/Users/kevinberger/Kyroz Code/` (espace au lieu de
`Kyroz_Code`) et du port 8081 → 8090 :

| Cause | Effet |
|---|---|
| Onboarding passé de 10 à 7 étapes (récap supprimé le 2026-06-20) | les personas se perdaient dès l'étape 6 |
| Portail de dépistage santé intercalé avant l'étape 1 | l'assistant n'était jamais atteint |
| Visite guidée + carte de consentement analytics à l'arrivée sur le plan | tous les clics interceptés → chaque écran déclaré « introuvable » |
| *(depuis le 2026-08-10)* le consentement analytics est **avant l'assistant**, plus sur le Plan | même effet, une marche plus tôt : il faut le neutraliser AVANT l'onboarding, pas après. `neutralizeFirstRun` le fait déjà (`@kyroz:analyticsConsent = 'denied'`) |
| Sous-écrans du Profil = `Sheet`, pas des routes | `page.goBack()` ne ferme rien, blocage sur la 1re feuille |
| `walkthrough-auth` et `qa-deep` attendaient un login MANUEL de 3 min | ne tournaient jamais sans humain → connexion invité |

**Deux pièges qui faisaient mentir les rapports**, corrigés :
`getByText('Plan')` est insensible à la casse (« Générer mon plan » le satisfait) → la preuve
retenue est le plan **persisté** ; et Supabase plafonne la création d'invités
(429 `over_request_rate_limit`, par heure et par IP) → `qa-full` le nomme au lieu d'afficher
des champs vides qui se lisent comme une app cassée.

Lancement : `npm run qa:full` · `qa:deep` · `qa:settings` · `qa:walkthrough`
(`KYROZ_URL`, `KYROZ_HEADLESS=1`). Détail dans [test/README.md](test/README.md).
Prérequis une fois : `npx playwright install chromium`.

### ✅ Re-réparés le 2026-08-05 — et cette fois la panne se VOIT

Le socle avait re-pourri au même endroit : deux séquences décrivaient des écrans qui
avaient changé. **Mesuré contre l'app qui tourne : les 5 scripts s'arrêtaient au portail
de dépistage santé, aucun n'atteignait plus l'écran Plan.**

| Séquence | Ce qu'elle faisait | Ce que l'écran fait vraiment |
|---|---|---|
| `passScreening` | cherchait l'attestation « Je confirme être un adulte… » **d'abord** | elle n'est rendue qu'APRÈS les deux réponses (`allAnswered`, `HealthScreening.tsx` L144-164). Avant ça, l'écran dit « Réponds aux deux questions ». Séquence : **Non · Non · attestation · Continuer** |
| `runOnboarding` | remplissait un champ d'ÂGE (placeholder « 25 ») | l'étape 2 saisit une **date de naissance** depuis le 2026-08-02 (`BirthDateField`, trois champs Jour/Mois/Année). `basicsValid` restait faux → parcours bloqué à l'étape 2 |

**Le vrai défaut n'était pas la péremption — c'était le SILENCE.** Une séquence périmée
rendait `false`, le script continuait, et le rapport concluait « écran introuvable » : le
seul diagnostic à la fois faux et rassurant, puisqu'il accuse les écrans alors que le
parcours n'y est jamais arrivé. Ajouté au harnais :

- `panne()` — nomme la marche cassée, cite le texte réellement à l'écran (l'assistant y
  écrit lui-même son refus, cf. `blockReason`) et pose une capture `test/qa/panne-*.png` ;
- `etapeCourante()` — lit « ÉTAPE n / 6 », donc chaque « Continuer » **exige une preuve
  d'avancement** au lieu d'enchaîner sept clics dans le vide ;
- `passScreening` rend `'ok' | 'absent' | 'echec'` : « pas rencontré » (session déjà
  onboardée) n'est plus confondu avec « pas franchi » ;
- `bilanPannes()` en fin de script → **code de sortie non nul**, et les scripts s'arrêtent
  au lieu de dérouler une liste de « introuvable » qui vise les mauvais écrans.

⚠️ **Le dernier chemin muet n'était pas un écran mais une ÉTAPE SANS VALIDATION.** Les
étapes 5 (objectif) et 6 (préférences) sont les seules que `canProceed` laisse toujours
passer : une preuve d'avancement ne prouve donc rien pour elles. Un sous-titre de
`GOAL_SUB` devenu faux aurait fait passer le persona avec l'objectif par DÉFAUT (« cut »),
et le rapport aurait rendu un plan complet, vert et plausible — pour un profil qu'on n'a
pas demandé. `runOnboarding` compare désormais l'objectif **servi** (`@kyroz:profile`) à
celui demandé. Vérifié par mutation : un libellé faussé rend « objectif demandé
« maintain », objectif servi « cut » » au lieu de 12 repas verts.
➡️ **Là où l'app ne valide rien, vérifier ce qui est SERVI, pas ce qui a été cliqué.**

### 🔒 Le verrou qui empêche la TROISIÈME fois — `lib/__tests__/harnaisEcrans.test.ts`

Tout ce qui précède répare le passé. Le harnais est reparti faux **deux fois pour la même
raison structurelle** : il pilote l'app par ce qu'elle AFFICHE, ces textes vivent dans les
écrans, et rien n'obligeait à prévenir le harnais en les changeant. La panne ne pouvait se
voir qu'en lançant un navigateur contre un serveur — donc jamais dans `npm test`, jamais
dans un diff. D'où des jours de sommeil, deux fois.

Le test lit les fichiers du dépôt (ni navigateur ni serveur, 75 ms) et verrouille
**40 ancres** : libellés cliqués, placeholders remplis, clés AsyncStorage, plus quatre
tables recopiées qui doivent suivre leur source — `TABS` ↔ les onglets montés, `GOAL_SUB`
↔ `GOALS`, le nombre d'étapes jouées ↔ `TOTAL_STEPS`, et l'ORDRE de `passScreening`
(réponses avant attestation, nombre de conditions compté et non figé).

**Les deux côtés sont vérifiés** — l'écran ET le script. Un libellé retiré de l'app rougit ;
un libellé retiré du script rougit aussi, sinon la table du test deviendrait à son tour une
vérité de plus que personne ne relit.

**Vérifié par MUTATION, sur les deux pannes réelles rejouées dans l'app** :
`placeholder="1994"` → `"1993"` et un sous-titre d'objectif reformulé font tomber
2 cas sur 40, avec le message qui nomme la conséquence (« fillPh() ne remplira RIEN, en
silence »). Suite complète **au moment de la livraison** : **1 058 tests verts** (63
fichiers), `tsc` propre. *(Chiffre DATÉ du 2026-08-06, laissé tel quel : c'est une trace,
pas un état. L'état courant vit dans la table de tête et dans la ligne « Tests » de la
référence — ce sont les deux seuls à maintenir, et ils avaient déjà divergé deux fois.)*

⚠️ **Ce qu'il ne sait PAS faire, et il ne faut pas le croire plus fort qu'il n'est** :
dire que l'ENCHAÎNEMENT est encore juste. Le défaut du 2026-08-05 lui aurait échappé —
« Je confirme… » existait toujours, seul son MOMENT avait changé. La preuve du parcours
reste une passe Playwright. Ce test ferme le chemin par lequel la dérive est réellement
arrivée : un texte changé d'un côté sans l'autre.

⚠️ Le persona porte désormais `birth: { d, m, y }` et **plus de champ `age`** — il ne
remplirait plus rien, et ce serait une seconde source de vérité (l'âge est dérivé de la
date, `lib/birthday.ts`).

**Vérifié de bout en bout le 2026-08-05** contre l'app qui tourne — **les 4 personas de
`qa-full`, un par un** (12 repas planifiés chacun) : H1 cut 2208 kcal · H2 lean_bulk
2773 · F1 recomp 1645 · F2 maintain 1914, 0 erreur page. Les personas FÉMININS comptent :
ils sont les seuls à exercer le clic « Femme » de l'étape 2. `qa-settings`,
`qa-deep`, `walkthrough` et `walkthrough-auth` atteignent l'écran Plan, sortie 0.
**Garde-fou vérifié par MUTATION** : un placeholder de date faussé fait rendre
« ✗ PARCOURS BLOQUÉ [onboarding-etape-2] », avec la phrase de l'app à l'appui et une
capture — c'est exactement ce qui manquait pendant que les scripts échouaient en silence.

## Chantiers de la session du 2026-07-30 — détail

> **1** et **5** sont livrés. **1-bis, 2, 3 et 4 sont encore ouverts** : leur ligne d'action
> est dans la liste unique en haut (`D1`, `D2`, `D3`, `D4`) — ce qui suit en est le
> *raisonnement complet*, avec les mesures qui l'appuient. La liste dit quoi faire,
> ceci dit pourquoi.

### 1. ✅ RÉPARÉ (2026-07-30) — la borne basse de l'ancre protéine

**Décision du fondateur : borne basse `protein` = 0,5.** Prise sur mesures, pas sur avis.

**Ce qui a changé — 3 lignes, AUCUNE recette touchée :**
- `Recette/recettes-kyroz.json` → `config.scaling_factors_by_role.protein` : `[1, 1.7]` → **`[0.5, 1.7]`** ;
- `lib/adaptRecipe.ts` → le clamp `kp = Math.max(1.0, kp)` suit désormais la config ;
- `lib/adaptRecipe.ts` → `proteinFloor` = la **cible du repas**, et non plus `max(cible, recette de base)`.

Le plancher disait *« ce plat ne servira jamais moins de protéine que ce que l'auteur a
tapé »* — sans rapport avec le besoin de la personne servie, et posé **trois fois**. Le
garde-fou utile reste : `protein_floor_tolerance` (0,95), relatif à la **cible**, qui lève
`protein_below_target`. La borne HAUTE est inchangée (1,7×) : on a ouvert le bas, pas touché
au haut.

**Résultat mesuré** (`npm run mesure:couverture`), recettes servables :

| profil | petit-déj | repas complet | collations |
|---|---|---|---|
| **F 55 sèche** | 38 → **55** | 23 → **91** | **0 → 18** |
| F 60 maintien | 42 → 50 | 41 → **145** | 2 → 21 |
| F 65 sèche | 41 → 54 | 48 → 95 | 1 → 23 |
| F 65 maintien | 40 → 55 | 50 → **151** | 2 → 28 |
| F 70 masse | 51 → 52 | 119 → 135 | 12 → 19 |
| F 80 sèche | 38 → 41 | 84 → 97 | 13 → 26 |
| H 65 sèche | 44 → 45 | 92 → 105 | 14 → 28 |
| H 70 maintien | 49 → 55 | 128 → 153 | 10 → 25 |
| H 80 sèche | 38 → 39 | 111 → 112 | 27 → 36 |
| H 80 maintien | 57 → 58 | 141 → 138 | 15 → 31 |
| H 95 masse | 37 → 38 | 105 → 97 | 18 → 23 |
| H 110 masse | 35 → 32 | 85 → 78 | 15 → 21 |

⚠️ **Le coût, assumé** : les trois plus gros profils perdent un peu de choix (H 110 masse :
repas 85 → 78, petit-déj 35 → 32). Le moteur dispose de plus de latitude vers le bas et
n'est plus forcé de remonter les ancres, donc certaines recettes ratent la cible HAUTE.
Vérifié en revanche sur le plan servi : F 55 sèche **et** H 110 masse atteignent leur cible
kcal et protéines à **0 % d'écart**.

`ENGINE_VERSION` 24 → **25** (sinon les plans en cache continueraient de servir l'ancien
plancher). Pas de `ENGINE_REV` : les cibles caloriques et macro ne bougent pas, donc aucun
avertissement utilisateur n'est dû.

**Deux tests ont été RÉÉCRITS, pas supprimés** (`adaptRecipe.test.ts`) : ils encodaient
l'ancienne règle « jamais sous la recette écrite » et encodent maintenant la nouvelle
« jamais sous la CIBLE ». Un test de plus vérifie que le haut n'a pas bougé.

### 1-bis. Ce qu'il reste à faire sur le catalogue — une commande de RÉDACTION

Le levier moteur est épuisé. Le créneau qui reste étroit ne se règle pas par un réglage :

**Il manque des collations LÉGÈRES.** La cible collation d'une F 55 sèche est de **130 kcal**
(la plus basse des 12 profils ; la suivante est à 176). La collation la plus légère du
catalogue plafonne à **118 kcal**, et **1 seule sur 66** peut passer sous 130. C'est
pourquoi ce profil reste à 18/66 malgré la réparation.

⛔ **Remède à NE PAS rejouer** : baisser la `qty` de l'ancre dans les recettes. Mesuré et
jeté le 2026-07-30. `adaptRecipe.ts:46-47` pose `min` ET `max` proportionnels à la quantité
écrite : baisser la base **rétrécit la plage des deux côtés** au lieu de la décaler. Appliqué
aux 138 recettes concernées, le plan d'un profil à 240 g de protéines tombait **18,5 % sous
sa cible** — et le chiffre phare ne bougeait pas (F 55 sèche restait à 0/66).


> *Le constat d'origine (2026-07-30, avant réparation) est conservé ici pour mémoire :
> 48 collations sur 66 ne servaient aucun profil féminin, 0 sur 66 une femme de 55 kg en
> sèche, et les seuils R8 étaient à pdj 32/78 · repas 45/170 · collations 0/66. La cause
> identifiée — l'ancre protéine — était la bonne ; le remède alors prescrit (réécrire les
> `qty` du catalogue) était faux, cf. l'encadré ⛔ ci-dessus.*

### 2. Vérifier le lot B2 de collations généré par le fondateur

Un JSON de 13 collations a été produit via Claude chat le 2026-07-30 mais **jamais passé aux
contrôles**. Il a été écrit AVANT le correctif sur les formats fermés : les collations bâties sur
`skyr`, `fromage_blanc_0`, `cottage_cheese` ou `yaourt_grec` sans féculent tomberont sur la règle
des triplets (R4). Souvent réparable en ajoutant un féculent léger, qui libère le couple.

### 3. Axe allergène — jamais tranché

`tahini` introduit le **sésame** et aucun champ du schéma ne porte les allergènes. `restrictions_ok`
ne couvre que les 7 régimes. Décision reportée depuis le 2026-07-29.

### 4. Les groupes R4 saturés qui restent

16 groupes de quasi-doublons de composition subsistent (whey+avoine ×6, yaourt de soja sans
féculent ×8, poulet+riz basmati ×5). Ils se règlent **en écrivant ailleurs**, pas en réécrivant
l'existant — le cliquet de `doublons.test.ts` les tient à leur niveau actuel.

### 5. ✅ TRANCHÉ + LIVRÉ (2026-07-30) — l'écrasement des domaines non protégés

Le fondateur a délégué l'arbitrage. La réponse n'est **pas** « fusionner partout » : ce
serait un contresens sur deux des cinq domaines.

**Critère retenu — HISTORIQUE ou ÉTAT COURANT ?**
- *Historique* (on ajoute, on ne retire presque jamais) → **fusion**. Perdre de la donnée
  accumulée est irréversible.
- *État courant* (retirer est une action normale) → **écrasement CONSERVÉ**. Sans horodatage
  par élément ni pierre tombale, une union rend la **suppression impossible** : le retrait ne
  « prendrait » jamais entre appareils. C'est un défaut PERMANENT, là où une perte se répare
  en refaisant le geste.

| Domaine | Décision | Raison |
|---|---|---|
| **Poids** | **fusion par date**, local prioritaire à date égale | Historique cumulatif, même nature que `low_ea_weeks` déjà fusionné par union. L'asymétrie était l'incohérence. |
| **Série** | **fusion** : record = max, série en cours = appareil le plus récent, `freeze_available` préservé | L'écrasement ramenait une série de 9 jours à 3 à cause d'un appareil en retard |
| **Recettes perso** | **fusion par identifiant**, local prioritaire | Une recette éditée est du travail ; une réinitialisation se refait en un tap |
| **Favoris** | **écrasement conservé** | L'union ferait revenir un favori retiré, à chaque connexion, sans fin |
| **Garde-manger** | **écrasement conservé** | C'est un STOCK : fusionner ressusciterait des aliments consommés et ferait acheter faux |

Les fusions vivent dans `lib/syncGuard.ts` (`mergeWeightEntries`, `mergeStreak`,
`mergeRecipeOverrides`) — pures, **idempotentes** (testé : l'hydratation tourne à chaque
connexion, une fusion qui dérive serait invisible pendant des semaines). Le résultat fusionné
est **repoussé au cloud** quand il apporte quelque chose, sinon les deux appareils
continueraient de s'écraser mutuellement ; aucun push si la fusion n'ajoute rien.

Deux `// SUSPECT:` de la phase C sont **résolus** par ce chantier (`freeze_available` effacé,
poids remplacé en bloc) et leurs tests sont devenus des non-régressions.

## Catalogue de recettes — vague de 113 (2026-07-30)

**Mergé sur `main` et déployé le 2026-07-30** (`c6e4e42`). Brief :
`Recette/BRIEF-GENERATION-RECETTES.md`. Commande opérationnelle : `Recette/lots/*.md`, générés par
`npm run gen:lots`.

**Deux erreurs de mesure trouvées et corrigées, à ne pas refaire :**
1. Un comptage de variété **agrégé sur trois gabarits** annonçait 21 à 30 recettes distinctes par
   créneau. Un utilisateur n'a qu'un gabarit : le vrai chiffre est **11 à 13**, pour tous les
   régimes. Ne jamais agréger ce qu'un utilisateur voit séparément.
2. Les 9 profils de contrôle étaient **tous masculins**. L'ancre protéine a un facteur minimum de
   **1,00** — elle ne descend jamais sous la base — donc un catalogue écrit sur un homme de 80 kg
   pose un plancher au-dessus de la moitié basse de la population. Mesuré : **0 collation sur 66**
   servable à une femme de 55 kg en sèche, **48 sur 66** ne servant aucun profil féminin, jusqu'à
   **+128 kcal/j** servis au-dessus de la cible (44 % du déficit effacé).

C'est la même famille d'erreur que le partage glucides/lipides figé à 55/45 : **mesurer sur une
réplique des formules du moteur.** `scripts/mesure-couverture.ts` appelle `buildLocalPlan` puis
`adaptRecipe` et ne recopie rien — c'est la référence, y compris pour le §4.11 du brief.

**Ce que la mesure impose à l'écriture** : protéine de base BASSE, féculent HAUT. poulet 100 g +
riz 90 g (554 kcal / 33 P) sert 12 profils sur 12 ; le même à 160 g de poulet et 40 g de riz en
sert 6. Et la collation est le RESTE du budget, pas un shaker : cible protéique résiduelle de 1 à
18 g quand le catalogue est à 21,6 g de médiane.

**Outillage** (`npm run …`) : `gen:lots` · `check:doublons -- <f>` · `check:enveloppe -- <f>`
(règle R8, sort en code 1) · `mesure:couverture`. `check:enveloppe` a attrapé une erreur dans le
brief lui-même — une enveloppe commandée mais infaisable ; s'en servir AVANT de figer une consigne.

**Point ouvert** : la vague ajoute, elle ne répare pas. Les 48 collations invendables aux femmes
restent dans le catalogue. Le chantier se mesure maintenant en une commande.

> ## ⚠️ ARCHIVE — ne pas y prendre de consigne
>
> Les deux sections qui suivent sont les **anciennes listes de tâches**, conservées pour la
> trace de ce qui a été fait et pourquoi. Elles sont **périmées sur quatre points** et se
> contredisent entre elles : la **tablette** (« décision en attente, reco false » → en
> réalité décidée le 2026-07-27, build à faire), la **monétisation** (« prix non tranchés »
> → tranchée le 2026-07-27), la **diététicienne** (« contacter 2-3 diététiciennes » →
> écartée le 2026-07-29), et la **banque de calories** (« prochain chantier code » → livrée,
> retirée de Kyroz+ et ÉTEINTE le 2026-08-18, cf. `MONETISATION.md`). Ce qui reste à faire
> est **en haut du fichier**.

## RESTE (Phase 2)
- **▶ REPRISE DE SESSION — état au 2026-07-27.** Tout ce qui suit est **livré, testé (413 tests), mergé sur `main` et déployé**. Arbre git propre, rien en cours. Derniers lots sur `main` : recettes 314 + variété + fibres Ciqual + biais fibres sèche (`ENGINE_VERSION` 18, jusqu'à `d70af49`) ; **feature « objectif daté » / Kyroz+ mergée + déployée** (`5a4fc63`, migration `goal_target` **JOUÉE EN PROD** par le fondateur). ✅ **P0.2 résolu** : la CI (`deploy.yml`) lance désormais tsc + les 413 tests AVANT de déployer → un rouge bloque la prod (ce n'est plus « validé qu'en local »). **Session 2026-07-27 (recettes/moteur) : rien en attente. ✅ P3.3 (TDEE qui saute) RÉSOLU — normalisation `sports ↔ training_days_per_week` à la persistance, `sports` = source de vérité (`lib/syncGuard.ts` + câblage `sync.ts`/`useProfile.ts`), 413 tests. Reste sur la branche `fix/tdee-jump-p33` à merger.**
- **▶ DÉCISION PRODUIT 2026-07-27 — SUPPORT TABLETTE.** ✅ **CHANTIER FAIT le 2026-08-01 (C1), vérifié en natif le 2026-08-02.** *Entrée conservée pour la trace ; ce qui suit décrit l'état d'AVANT et n'est plus une consigne — en particulier « supportsTablet reste false » et « l'app est portrait-only », tous deux faux aujourd'hui.* Usage : cuisiner avec la recette sous les yeux sur tablette (aligné North Star). À faire (autre session) : (1) `app.json > ios.supportsTablet: true` ; (2) layout tablette — au minimum l'écran recette/cuisine (largeur max, lisibilité, cibles ; envisager le **paysage**, l'app est portrait-only) via breakpoints `useWindowDimensions` ; (3) screenshots iPad 13" (2048×2732). ⚠️ Dès `supportsTablet:true`, Apple EXIGE des screenshots iPad ET teste réellement la mise en page tablette (plus le simple mode compatibilité) → **ne pas soumettre `true` sans layout tablette prêt** (rejet). `supportsTablet` **reste `false`** d'ici là (permet une soumission iPhone-only entre-temps). Détail : `STORE-RELEASE.md` §2/§7/§9 + [[project-ipad-support-decided]]. (Le mythe « faut coder l'iPad sinon rejet » était faux ; ici c'est un choix produit délibéré, pas la peur du rejet.)
  - **Session Kyroz+ — objectif daté / monétisation (2026-07-27), LIVRÉE + DÉPLOYÉE (`5a4fc63`)** :
    - **Valeur premium tranchée PUIS construite** (comble le trou « que vendre ? » de `MONETISATION.md`) : Kyroz+ = **« piloter son objectif dans le temps »**. 3 piliers livrés. Le core loop reste 100 % gratuit.
    - **🎯 Objectif daté** (`lib/datedGoal.ts`, PUR + testé) : poids cible + date → **rythme SÛR** (⚠️ *re-vérifié le 2026-08-03 — cette ligne citait trois constantes qui n'existent plus* : `maxWeeklyLossPct()` **modulé par l'adiposité** (0,5 / 0,75 / 1,25 %/sem) et non un `MAX_LOSS_RATE_PCT` fixe à 1 ; `MAX_GAIN_RATE_PCT`=0,5 %/sem ; coût du kg **ASYMÉTRIQUE** `KCAL_PER_KG_FAT`=7700 / `KCAL_PER_KG_GAIN`=5000, pas un `KCAL_PER_KG` unique), delta calorique **branché dans le CERVEAU MACRO UNIQUE** : `recalcProfile` calcule un `kcalDeltaOverride` (via `datedGoalKcalDelta`) qui **remplace** `GOAL_CONFIG[goal].kcalDelta` dans `calculateMacros`/`macrosPercent` → **plancher `MIN_KCAL` (§6) préservé**, protéines inchangées. Échéance passée / poids atteint = inactif (retour au delta d'objectif normal). Éditeur « Objectif daté » (Profil : `GoalTarget`, **échéances DÉRIVÉES DU CORPS** depuis A27 — `lib/goalLadder.ts` ; les horizons 4/8/12/16/24 sem ne survivent qu'en repli → date dérivée, aperçu live des kcal ajustées + avertissement « objectif ambitieux » si bridé ; **date exacte préservée à la réouverture** — pas de re-arrondi de l'horizon. 🔴 **RANGÉE RETIRÉE le 2026-08-07 (A28, décision fondateur) — l'échéance est une DATE** : trois champs jour/mois/année (`components/DateInput.tsx`, partagé avec la date de naissance), `checkEcheance` refuse l'échéance passée et l'au-delà de l'horizon de projection, `closestHorizon` supprimé. L'échelle A27 survit pour fournir la date PRÉ-REMPLIE **et l'ESTIMATION** (« la première date que Kyroz peut tenir » + « Viser cette date ») — pas du code mort. L'estimation vient de sa marche 1, **jamais** de `status.projectedDate`, qui suppose une échéance expirée et diffère de 12 à 100 jours). Carte de suivi **partagée** `components/DatedGoalCard.tsx` sur **Profil ET Plan** (deep-link `@kyroz:openEditor='dated_goal'`, même mécanisme que la perso macros).
    - **📈 Trajectoire + réassurance ANTI-CHARGE-MENTALE** (`components/Transformation.tsx`, `WeightChart` enrichi) — **décision produit clé** : la courbe montre une **ZONE ombrée SEULE** (couloir cible ± `TRACK_TOLERANCE_KG`=**1 kg**, large exprès car le poids fluctue de 1-2 kg/j), **NI ligne « à suivre » NI marqueur d'arrivée** (une ligne au pixel près = anxiogène = anti-North-Star). Verdict `TrackVerdict` **jamais alarmant** : « ✓ Dans ta zone » / « En avance » / « Ça descend à ton rythme » (le pire cas est NEUTRE, pas de ⚠️/ambre), ancré sur l'**acquis** (« Depuis le départ : −X kg ») + le mécanisme vrai qui rassure : « la pente est un repère, pas une règle — à chaque pesée Kyroz réajuste tes calories ». Recalage auto **gratuit** : `useWeightLog.logWeight` appelle déjà `recalcProfile` à chaque pesée du jour → la trajectoire se recalcule seule (`idealWeightAt`/`trackStatus`, purs + testés). ⚠️ En prise de masse le sens du « retard » s'inverse.
    - **📸 Module Transformation** : comparaison **photos avant/après** (1re vs dernière photo, datées + poids + Δ). **LOCAL-ONLY** (RGPD, `lib/photos.ts` inchangé — rien d'uploadé). Rangée plafonnée à 420 px (sinon photos géantes sur le web large).
    - **🐛 Fix pré-existant attrapé** : `WeightChart` se dessinait **HORS CADRE** quand `Dimensions.get('window').width` renvoyait 0 (largeur SVG négative → SVG invisible, bug silencieux) → largeur **auto-mesurée** via `onLayout` (la prop `width` n'est plus qu'une valeur initiale, plancher `MIN_CHART_WIDTH`). L'axe X est passé **proportionnel au TEMPS** (avant : indexé par point → une trajectoire superposée aurait menti sur pesées irrégulières).
    - **Persistance** : colonne `goal_target jsonb` (`schema.sql` + migration `2026-07-21_profiles_goal_target.sql` **jouée en prod** + `PROFILE_COLS` de `lib/sync.ts`). `GoalTarget` = `{target_weight_kg, target_date, start_weight_kg, start_date}` (dates `localStamp`). Tests : `datedGoal.test.ts` (17). Vérifié en preview web (aperçu bridé/non-bridé, sauvegarde → macros recalculées, carte Plan, trajectoire + verdict on-track/behind, photos avant/après).
    - ⚠️ **GATING PREMIUM PAS ENCORE POSÉ** : la feature est fonctionnelle et **GRATUITE pour l'instant** — le verrou `is_premium` arrive **avec le paywall** (décision fondateur : construire la valeur → PUIS le paiement). **Canal de paiement TRANCHÉ (2026-07-27) : achat in-app Apple App Store + Google Play, via RevenueCat** (`react-native-purchases`) — **PAS Stripe seul** (refusé par les stores pour les abos). `is_premium` = dérivé de l'entitlement RevenueCat. Prochain chantier code = ce paywall + banque de calories. Cf. `MONETISATION.md`.
  - **Session UX / rétention / analytics (2026-06-19 → 07-03), LIVRÉE** : préférences (**Halal** + **saisie libre des allergènes**) ; **onboarding simplifié 10 → 8 écrans** (fork macros retiré, écran Variété fusionné dans Préférences, étape Jours allégée + **jours de repos** ajoutés, étape récap supprimée) ; **reveal du 1er plan (J1)** (`FirstPlanReveal`) ; **bouclier de série** (gel d'1 jour manqué, `advanceStreak`) + carte série enrichie ; **rappel quotidien** déplacé → Profil uniquement ; **analytics PostHog EU** (`lib/analytics.ts`) **dormant + consent-gated RGPD** ; **perso % macros rendue découvrable** (lien « Ma répartition (%) » sur le Plan → deep-link éditeur). Bugs corrigés : %MG « 23→33 » (`onBlur` cf. [[reference-rnweb-onendediting-noop]]), jours de repos absents de l'onboarding, ligne « Calories & macros » qui affichait toujours « Calculées ».
  - **Session recettes — catalogue 264 → 314 (2026-07-22), LIVRÉE** :
    - **Dossier `kyroz-app/Recette/` créé** (demande fondateur) : le catalogue LIVE y est remonté et renommé `recettes-kyroz.json` (l'ancien chemin `lib/data/recettes-kyroz-100.json` disait « 100 » pour 264 recettes) ; les livraisons brutes reçues sont archivées dans `Recette/drops/` (`2026-06-16-refonte-adaptrecipe`, `2026-06-19-vegan`, `2026-07-22-sans-gluten` — ex-`_archive/` et ex-`docs/`, `_archive/` supprimé) ; `Recette/README.md` documente la chaîne d'ajout complète + les invariants testés. Imports mis à jour (`lib/recipeData.ts`, `recipeFoodMap.test.ts`, `gen-validation-recettes.ts`) ; `lib/data/` supprimé.
    - **+50 recettes sans gluten mergées** (20 petit-déj, 12 collations, 18 repas — ids `pd59-78`, `col55-66`, `rep153-170`). Le drop reçu contenait 214 recettes dont **164 déjà mergées le 2026-06-19** → delta calculé, **aucun doublon d'id**, **aucun nouvel ingrédient** (donc rien à mapper Ciqual ni à déclarer dans `recipeDiet.ts`), `per_100` des ingrédients communs **identiques** à la table actuelle.
    - **Validées avant merge** (script de contrôle) : **50/50 réellement sans gluten** — vérifié sur `restrictions_ok` **DÉRIVÉ par ingrédient**, pas sur le tag annoncé ; tout `ref` existe ; aucune `qty` > `abs_max_qty` ; aucun `flavor`/`vegetable` marqué `scalable` ; `base_servings === 1` ; toutes ont une ancre protéine `scalable` ; garde-fou `macros_per_serving` — écart max **9 %** (`rep157`), limite 30 %.
    - ⚠️ **8 des 50 n'ont aucun ingrédient gras `scalable`** (`pd60/64/66/68`, `col55/57/61/66`) → le moteur ne pourra pas les faire monter en lipides (avertissement « sous la cible » possible). **Non corrigé volontairement** : ce sont des petit-déj/collations maigres par construction (galettes de riz–skyr, riz au lait–whey) ; y ajouter de l'huile serait une décision de contenu → diététicienne. Même famille que P3.4 (`rep13/47/52`), mais bien moins gênant sur un petit-déj que sur un repas complet.
    - `ENGINE_VERSION` **14 → 15** (régénère les plans en cache), compteurs de tests **264 → 314** (`recipeMap`/`recipes`/`recipeData`), `_meta.count` = 314. **387 tests verts / 24 fichiers**, `tsc --noEmit` OK. `VALIDATION-RECETTES.md` régénéré (P2.1 clos).
  - **Session sortie stores + qualité recettes (2026-07-16/17), LIVRÉE** :
    - **Prépa stores** — playbook complet `STORE-RELEASE.md`. `eas.json` créé (profils dev/preview/production + submit) ; `app.json` nettoyé (identifiants `app.kyroz.mobile`, permission micro parasite retirée, **splash natif** `expo-splash-screen` sombre `#000000`) ; **accès reviewer** débloqué en code (`lib/reviewAccess.ts` : invité gated par `EXPO_PUBLIC_REVIEW_CODE`, **inerte sur le web public** car le workflow ne pose pas le code → l'abus anonyme reste fermé) ; textes de fiche FR + réponses formulaires confidentialité Apple/Google + note reviewer rédigés. **Reste fondateur (non codable)** : comptes Apple (99 €/an) + Google Play (25 €, ⚠️ 12-20 testeurs/14 j en compte perso), screenshots + feature graphic, poser le secret `EXPO_PUBLIC_REVIEW_CODE` (déjà fait côté dashboard EAS), lancer `eas build`/`submit`. **Décision en attente** : `supportsTablet` (true → impose des screenshots iPad ; reco false).
    - **SIREN `106386162`** renseigné (`constants/legal.ts` + `public/legal.html` + `RGPD-REGISTRE.md`) → mentions légales valides, blocant P1.1 **résolu**.
    - **Recettes** : 13 composites mappés Ciqual (**99/113**) + **garde-fou de mapping PAR INGRÉDIENT** (`recipeFoodMap.test.ts` — l'ancien ±30 % sur la recette entière était AVEUGLE aux ingrédients denses peu pesés) ; **col04** (dattes > `abs_max_qty` → fiche ≠ servi) corrigé + test ; **3 noms de légumineuses** « cuits/égouttés » → neutres (on pèse SEC) + test ; **hygiène flavor/vegetable `scalable`** (inerte mais mensonger) + test ; **rep32 « cabillaud pané »** n'est plus « sans gluten » (chapelure ajoutée comme ingrédient + `VIOLATIONS` → dérivation régime corrigée, macros re-comptées) + test ; **dossier diététicienne RÉGÉNÉRABLE** (`npm run gen:validation` → `scripts/gen-validation-recettes.ts` ; l'ancien listait encore les 50 recettes placeholder supprimées) — ⚠️ **le script ET la commande N'EXISTENT PLUS** (supprimés au rangement `6c31df2`), et c'est cohérent : la validation par une diététicienne a été **écartée** le 2026-07-29 (CLAUDE.md §6). Le dossier produit à l'époque survit en archive (`docs/archive/2026-07-29-validation-recettes.md`). Ne pas essayer de relancer la commande. **Audit multi-agent des 264 recettes** lancé mais **COUPÉ par la limite de session** (71/146 agents ; re-lançable, cf. §Data) → défauts déterministes corrigés, ingrédients-fantômes mineurs restants (teriyaki/miso/houmous) **capturés** pour la diététicienne.
    - **Monétisation** recadrée (`MONETISATION.md`) : le découpage proposé faisait payer **4 features DÉJÀ gratuites** (carb cycling, recalc macros au poids, recettes perso) ou sans objet (« 50→+100 recettes » alors qu'il y en a 264) → réécrit.
  - **▶ PROCHAINE SESSION = BANQUE DE CALORIES + PAIEMENT (RevenueCat)** (fondateur, session dédiée). La **valeur premium est construite + déployée** (objectif daté ci-dessus) → le trou « que vendre ? » est **comblé**. Restent 2 chantiers :
    - **(1) Banque de calories** (pilier 2, le fidélisant) : laisser l'user **choisir** un écart calorique un jour donné (« resto samedi +600 »), **compensé sur la semaine** (protéines pleines, jamais < `MIN_KCAL`). ⚠️ **TOUCHE LE MOTEUR** (`buildLocalPlan` dans `planEngine.ts`) = extension du lissage hebdo existant (`weekDeficitKcal` / `DAILY_SMOOTH_CAP`=50, boucle jour par jour) → **à faire avec soin** (CLAUDE.md : core loop > tout). Piste : un offset par jour stocké au profil (comme `goal_target`), lu par `buildLocalPlan` dans le calcul de `dayCibleKcal`.
    - **(2) Paiement = RevenueCat** (pas Stripe seul : ⚠️ **Apple/Google REFUSENT Stripe pour les abos numériques** → motif de rejet ; RevenueCat emballe Apple IAP + Play Billing + Stripe web). Dériver le flag `is_premium` → gater les features Kyroz+ (objectif daté, banque, transformation). `profiles.stripe_customer_id` déjà en schéma. Prix reco : **4,99 €/mois · 39,99 €/an**.
  - **▶ Backlog du 2026-07-03** → voir le **BACKLOG PRIORISÉ** ci-dessous (toujours d'actualité ; P0.1 migrations Supabase + P0.2 CI sans tests non traités).

### ▼ BACKLOG PRIORISÉ (audit multi-agents 2026-07-03 : 97 remontées → 31 chantiers)

> Le core loop tourne : **rien ci-dessous ne casse l'app pour un utilisateur web aujourd'hui**.
> Mais 3 choses cassent **EN SILENCE** et 2 sont **en retard** (l'app est DÉJÀ publique en web).
> 🔴 = **vérifié directement dans le code** (pas une supposition).

#### 🔴 P0 — Cassé en silence — **~3 h, à faire en premier**
- **P0.1 — Migrations Supabase : SCHÉMA CONFIRMÉ ALIGNÉ EN PROD (2026-07-21).** Les 5 migrations regroupées dans `supabase/migrations/2026-07-21_pending_all.sql` (fixed_meals + hidden_recipes + rest_weekdays + force_rls + drop meal_plans) ont été **jouées en prod par le fondateur** ; la requête §VÉRIF renvoie **30/30 colonnes profil présentes** et **`rls_forced = true`** sur les 6 tables sensibles. Reste (fondateur, invérifiable depuis le repo, cf. `supabase/RUNBOOK-PROD.md` §2) : **confirmer une écriture RÉELLE** (changer une pref sync → vérifier qu'elle atterrit dans `profiles`). Contexte historique : `schema.sql` n'est PAS auto-appliqué ; si une colonne manque → `pushProfile` en PGRST204 → sync profil morte en silence (AsyncStorage masque). Piège déjà rencontré 3×.
- ~~**P0.2 — la CI déploie SANS lancer les tests ni `tsc`.**~~ **RÉSOLU (2026-07-26).** `.github/workflows/deploy.yml` lance désormais, dans le job `build` AVANT l'export : `npx tsc --noEmit` (étape « Typecheck ») puis `npm test` (étape « Tests (vitest) »). Le job `deploy` dépendant de `build`, un tsc ou un test rouge **bloque le déploiement** au lieu de publier du cassé. Vérifié : run CI verte avec les 2 étapes visibles + arbre commité vert en isolation (379 tests). ⚠️ Chaque push tourne maintenant ~1 min de plus (tsc + vitest) — normal, c'est le filet.
- ~~**P0.3 — `supabase/schema.sql` incomplet**~~ **RÉSOLU (constat 2026-07-21)** : `hidden_recipes` (+ `fixed_meals`, `rest_weekdays`) SONT bien dans `schema.sql` (lignes 49/57) — la remontée du backlog était périmée. Recréer la base à partir de `schema.sql` reproduit un schéma complet + `on delete cascade` sur les 6 tables.
- ~~**P0.4 — « Supprimer mon compte » : test bout-en-bout à faire.**~~ **RÉSOLU / VÉRIFIÉ EN PROD (2026-07-23).** Test end-to-end sur la vraie Supabase de prod (compte invité jetable via le dev local, qui tape sur la même Supabase) : compte avant = existe (200) + profiles=1/streaks=1 → appel `POST functions/v1/delete-account` → **200 `{"success":true}`** (donc **déployée**, pas de repli silencieux) → ancien jeton = **403** (ligne `auth.users` supprimée) → **toutes les tables retombent à 0** (cascade OK). Le vrai bouton in-app (`RecipeDetail`/Profil → feuille « Supprimer définitivement ») déclenche bien le flux + déconnecte. Conformité RGPD droit à l'effacement : **prouvée**. `on delete cascade` présent sur les 6 tables (`schema.sql`).

#### ⚖️ P1 — Conformité EN RETARD (l'app est publique) — **~½ journée**
- ~~**P1.1 — 🔴 le SIREN s'affiche en `[À COMPLÉTER]` EN CLAIR**~~ **RÉSOLU 2026-07-16** : SIREN `106386162` renseigné (`public/legal.html:39`, `constants/legal.ts:19`, `RGPD-REGISTRE.md:12`). Mentions légales désormais valides.
- ~~**P1.2 — AUCUN hard block grossesse / allaitement / pathologie dans le CODE.**~~ **RÉSOLU (2026-07-23).** Écran-portail de dépistage **BLOQUANT** en tête d'onboarding (`components/HealthScreening.tsx` + logique pure testée `lib/healthScreening.ts` + greffe `app/(auth)/onboarding.tsx`). Avant l'assistant, l'utilisateur déclare grossesse/allaitement ou pathologie chronique (diabète, rénale/cardiaque, TCA…) → **cul-de-sac** (renvoi médecin/diététicien·ne, pas d'accès à la génération, seule sortie = « Se déconnecter »). Sinon, **attestation positive requise** (« adulte en bonne santé, aucune situation ») pour continuer, horodatée dans `@kyroz:healthScreening` (local ; `SCREENING_VERSION` pour re-dépistage si les critères changent). Le portail s'affiche AVANT l'assistant sans renuméroter les étapes (rendu conditionnel après tous les hooks). Le hard block d'âge (`MIN_AGE` = **18** depuis le 2026-07-28) + « < MIN_KCAL » reste dans `validateProfile` (tdee.ts). Vérifié en preview (blocage + attestation + non-remontré + 392 tests). ⚠️ Attestation **local-only** pour l'instant (pas de colonne serveur) — suffisant pour le gate ; un enregistrement serveur horodaté serait un + juridique (à voir avec la migration `datedGoal`/WIP en cours pour mutualiser).
- ~~**P1.3 — Permission micro `RECORD_AUDIO` — risque revue Google Play**~~ ✅ **RÉSOLU — re-vérifié le 2026-08-05.** L'entrée demandait encore « VÉRIFIER le manifeste fusionné » : c'est fait, et le correctif est en place. `app.json > android.blockedPermissions` liste `RECORD_AUDIO` **et** `SYSTEM_ALERT_WINDOW` — Expo les écrit en `tools:node="remove"` dans le manifeste fusionné, ce qui neutralise justement la voie par laquelle `expo-image-picker` les réintroduisait. Contrôle déjà consigné en CLAUDE.md §2 (« aucune permission Android ajoutée — vérifié sur le manifeste GÉNÉRÉ, pas sur la config »). ⚠️ Le raisonnement de l'entrée restait juste : `android.permissions: []` ne prouvait rien, c'est bien la fusion de manifeste qu'il fallait regarder. C'est la CONCLUSION qui avait vieilli, pas l'analyse.

#### ⏳ P2 — Chantier LONG, à lancer MAINTENANT (temps incompressible : des semaines)
- ~~**P2.1 — Régénérer `VALIDATION-RECETTES.md`**~~ **FAIT** (script `scripts/gen-validation-recettes.ts`, `npm run gen:validation` — ⚠️ passer par `npx tsx`, `tsx` n'est pas sur le PATH). Régénéré le **2026-07-22** sur les **314** recettes. Contrôle de cohérence énergétique : **2 écarts > 10 %** (`pd72` pudding chia 11 %, `rep112` soupe pois cassés 10 %) — cause bénigne identique (Ciqual compte l'énergie des fibres, pas le recalcul Atwater). ⚠️ **CLOS DÉFINITIVEMENT le 2026-07-30** — script et entrée npm supprimés, dossier figé dans `docs/archive/2026-07-29-validation-recettes.md` : il n'y a plus rien à régénérer. Contrôles vivants = `npm run mesure:couverture` + `npm run check:doublons`.
- 🚫 **P2.2 / P2.3 — VALIDATION DIÉTÉTICIENNE : ÉCARTÉE PAR LE FONDATEUR (2026-07-29). NE PLUS LA REMONTER** dans les bilans ni les recommandations de chantier. Ce n'est pas un oubli à rattraper, c'est une décision.
  - Ce que ça recouvrait : validation des recettes → `validated_by_dietitian: true` (aujourd'hui `false` en dur dans `lib/recipeMap.ts`), et validation des coefficients protéines de `GOAL_CONFIG` (que le code annonce lui-même « PROVISOIRES »).
  - ⚠️ **Ce que la décision ne fait PAS disparaître, à traiter autrement** : (1) `validated_by_dietitian` reste `false` — donc **aucun écran ne doit prétendre l'inverse**, et la revue App Store est sévère sur les allégations santé ; (2) CLAUDE.md §6 en fait un prérequis, **il y a donc une contradiction à trancher dans CLAUDE.md**, pas à laisser dormir ici ; (3) les coefficients protéines pilotent la cible de tous les plans et restent marqués provisoires dans le code — s'ils ne seront jamais validés par un tiers, **retirer la mention « provisoire »** ou l'assumer explicitement, plutôt que de laisser le code dire qu'il attend quelqu'un qui ne viendra pas.

#### 🎯 P3 — Rétention / North Star
- ~~**P3.1 — 🔴 le calcul des FIBRES est faux (mot-clé sur le nom).**~~ **RÉSOLU 2026-07-23 (`ENGINE_VERSION` 17).** Les fibres sont désormais **sourcées Ciqual** comme les autres macros : `scripts/convert-ciqual.py` extrait la **colonne 26 « Fibres alimentaires »** → `Food.fiber_g` (3326/3341 aliments, 99 %) ; `recipeData` résout `RECIPE_INGREDIENTS[ref].fiber_per100g` (Ciqual si mappé, sinon `REF_FIBER_MANUAL` pour les 14 refs non mappés) ; `fiber.ts` calcule par **ref → food_id → repli mot-clé** (le mot-clé ne sert plus que pour un ingrédient custom au nom seul). **Impact mesuré** : plus **AUCUNE** recette à 0 g (avant : chia/framboises/noix/légumineuses comptés 0), fibre moyenne **9 g/portion**, `col39` pudding chia **0 → 9,6 g**. Le nudge fibres en sèche (`fiberStrong`) travaille maintenant sur de vraies valeurs. Tests : `fiber.test.ts` (+5, path Ciqual par ref/food_id + « aucune recette à 0 g »). ⚠️ **Ré-exécuter `python3 scripts/convert-ciqual.py` régénère bien la colonne fibres** (source xlsx présente dans `data/ciqual/`, gitignorée).
- **P3.2 — « Enrichir le catalogue »** — **INVESTIGUÉ À FOND 2026-07-23 : ce n'était PAS un problème de catalogue.** Une fois P3.1 (mesure fibres) corrigé, le catalogue n'est **pas** pauvre en fibres : plafond atteignable du pool **GF = 81 g/j**, vegan 97 g/j (2× la cible sèche ~42). Le trou en sèche (GF cut 32 g, 6/7 j sous cible) venait de la **SÉLECTION** (le moteur choisissait autour de la médiane 29 g), **pas** d'un manque de recettes → **ajouter des recettes ne l'aurait pas corrigé.** **RÉSOLU côté moteur (`ENGINE_VERSION` 18)** : biais fibres à la sélection **en sèche uniquement** (`FIBER_SELECT_W = 0.005`, gate `fiberStrong` ; la fibre/portion baisse le score effectif → recettes plus fibreuses préférées). Mesuré : GF cut **32→39-40 g**, H cut **35→43**, F cut **32→42** ; **précision jour intacte (<1 %)**, variété quasi inchangée (sem 26→25/28), **maintien/prise de masse NON touchés** (témoin testé). `cut_aggressive` reste sous la cible (peu de kcal = peu d'aliment = limite PHYSIQUE, pas un bug). Tests : `variety.test.ts` (+2). ⚠️ **Reste un arbitrage diététicienne (P2.3)** : la cible sèche **16 g/1000 kcal** est-elle la bonne ? (32-35 g étaient déjà dans la norme santé ; on vise plus haut pour la satiété). **Sous-item restant, VRAI (pool)** : **POOL VEGAN** — petit-déj vegan **33/78**, repas vegan **57/170** ; en **vegan sèche** le pool + la contrainte kcal ne laissent qu'**1 petit-déj viable** (bf 1/7) → là, seul **ajouter des recettes vegan riches en protéines** aide. Couverture régime (sur 314) : petit-déj GF **42/78** · vegan **33/78** · GF+vegan **26** · repas vegan **57/170**.
- ~~**P3.3 — Bug : le TDEE peut sauter tout seul.**~~ **RÉSOLU 2026-07-27.** Si le profil revenait du cloud avec `sports: []` mais `training_days_per_week > 0`, le moteur basculait silencieusement sur le repli legacy (multiplicateur) → **la cible calorique changeait sans raison visible**. Tuait la fiabilité perçue (priorité n°2 de CLAUDE.md §5).
  - **Cause racine.** `sports` (liste de séances) et `training_days_per_week` (compteur) **encodent la même chose deux fois**. `calculateTDEE` choisit sa méthode selon `sports` : rempli → **MET** (précis) ; vide → **multiplicateur** (grossier). Quand les deux **divergeaient** (perte de `sports` au round-trip cloud), la méthode basculait → le TDEE maintenance sautait. Le calcul lui-même est SAIN (`tdee.ts` L66-72) : corrigé côté **PERSISTANCE**, sans dénaturer la règle.
  - **FIX LIVRÉ (2 fonctions pures dans `lib/syncGuard.ts`, câblées en 2 points, 0 migration).** `sports` = **source de vérité**. (1) `normalizeProfileActivity(p)` : si `sports` non vide → recale `training_days_per_week = totalSessionsPerWeek(sports)` — appliqué à **chaque chargement** (hydratation cloud dans `sync.ts` + lecture locale dans `hooks/useProfile.ts`). (2) `reconcileCloudSports(cloud, local)` : à l'hydratation `pull_cloud`, un `sports` cloud absent/vide **ne peut plus effacer** un `sports` local renseigné (champ absent = « pas d'info » ≠ « zéro séance »). Effet : les deux entrées ne peuvent plus diverger → le TDEE ne peut plus sauter. 🔴 **La phrase qui suivait était FAUSSE — corrigée le 2026-07-29.** Elle affirmait : « Limite ASSUMÉE (inchangée) : un profil *vraiment* legacy (jamais eu de `sports`) reste à juste titre sur le multiplicateur — repli valide, pas le bug ». **Il n'y a plus AUCUN repli par multiplicateur depuis P1.1** (chemin TDEE unique) : `calculateTDEE` fait `BMR × NEAT + dépense sport` sans aucun branchement, et un `sports` absent ajoute simplement 0. Mesuré sur 128 profils legacy : le code sert **708 kcal/j de MOINS** que le multiplicateur en médiane (−205 à −1 608), dans **128/128 cas**. Et `training_days_per_week` est **totalement inerte** — 2 207 kcal quel que soit le compteur, de 0 à 14 jours. Le danger n'était pas l'inexactitude, c'est que la phrase disait au lecteur suivant qu'il n'y avait rien à corriger. ⚠️ **Ce qui reste à trancher, et qui n'est PAS un bug établi** : un compte historique sans séances est-il servi trop bas, ou est-ce l'ancien multiplicateur qui le gonflait ? Le second est probable (le multiplicateur incluait l'exercice), mais personne ne l'a mesuré. Tests : `syncGuard.test.ts` (+9), `tdee.test.ts` (+1 régression bout-en-bout « la couche sync referme la frontière »).
- ~~**P3.5 — 🔴 la VARIÉTÉ du plan ne suit pas la taille du catalogue.**~~ **RÉSOLU 2026-07-23 (`ENGINE_VERSION` 16).** Diagnostic confirmé : `usage` (rotation intra-semaine) n'était qu'un **départage enfoui** dans `selectMealAdapted`, SOUS deux clés absolues — les **fibres en sèche** (`fiberStrong`) et le **besoin objectif/sport** (`need`) → la recette « la meilleure sur cet axe » gagnait 7 j/7 (petit-déj **2/7** distincts malgré 78 recettes ; le paradoxe `max` < `balanced` venait de la bande plus large qui laissait entrer une recette `need`-matchée qui monopolisait). **Fix** : `usage` replié dans le **score effectif** (`effOf = fitScore + VARIETY_STEP·usage`, `VARIETY_STEP = 0.06`) utilisé pour la BANDE → une recette servie sort de la bande et cède la place ; les nudges fibres/objectif restent (qualité au 1er passage) mais ne monopolisent plus. **Mesuré (seed 0)** : petit-déj **2/7 → 7/7**, semaine **~12/28 → 28/28** ; sur ~12 k repas la **précision est plate** (écart kcal/jour ~1 %, absorbé par `tightenDay` + lissage hebdo ; les recettes à flag ≥ 0.4 restent hors bande). Effet de bord assumé : la rotation surface des recettes très fibreuses → seuil du recompute Atwater de `multiProfile.test` relâché 0.13 → 0.15 (plafond réel 13,3 %, `col39` pudding chia — vraie nutrition, pas un défaut). Tests : `variety.test.ts` (+4, échoue sur l'ancien code). ⚠️ **N'annule PAS P3.2** : sur pool vraiment mince (repas vegan 57/170) la rotation ne peut varier que ce qui existe.
- ~~**P3.4 — des recettes ne peuvent pas atteindre leur cible lipides**~~ ✅ **TRAITÉ le 2026-08-05 — 20 recettes sur 30, et les 10 autres sont un REFUS motivé.**

  ⚠️ **La fiche se trompait trois fois, et la troisième change la décision.** (1) Elle disait « 3 recettes (rep13/47/52) » : elles étaient **30**, l'énoncé datant d'un catalogue de 314 quand il en compte 512. (2) Elle disait « 15 min ». (3) Surtout, elle disait **« l'utilisateur voit un avertissement sous la cible »** — c'est FAUX : `fat_below_target` a l'audience `'selection'` et `RecipeDetail` ne rend que les drapeaux `'user'`. Le manque ne produit **aucun message** ; il coûte une pénalité de sélection (+0,4, `planEngine`).
  ➡️ **La conséquence annoncée par une fiche décide du prix qu'on est prêt à payer.** Croire à un message visible justifiait de dégrader autre chose ; savoir que c'est un signal de tri ne le justifiait plus.

  **Ce qui a été fait** : un gras ajustable, choisi par plat (amandes, noisettes, noix, purée d'amande, beurre de cacahuète, chia, courge, avocat, huile d'olive), avec son **étape de préparation** — un ingrédient dont aucune instruction ne parle rend la recette incuisinable. Tous végétaux : aucun régime n'est dégradé.

  📊 **Mesuré à quantité nominale, sur les 30** : 19 gagnent des profils (`pd64` 0→12, `pd37` 0→7, `pd03` 5→11, `pd46` 8→12), 1 est inchangée, et **10 en PERDENT** — jusqu'à `col61` 9→1 et `col02` 10→2. Ces 10 sont donc **écartées** (`pd36 pd40 pd66 col02 col08 col11 col18 col22 col29 col61`), majoritairement des shakes et des mousses, dont la cible de collation descend à 115 kcal.
  ⚠️ **Baisser la quantité ne les sauve pas** : `adaptRecipe` a un plancher de scaling à **5 g**, donc sous ~5 g l'ingrédient est ÉPINGLÉ — il grossit la recette sans rien pouvoir ajuster. Balayé jusqu'à 3 g, la perte persiste.

  📊 **Résultat R8 (avec les 6 recettes jamais servies, ci-dessus)** : petit-déj moyenne **8,54 → 9,11**, sous le seuil **37 → 31** · repas complets **8,72 → 8,86**, sous le seuil **70 → 63** · collations sous le seuil **5 → 4**. **Recettes à 0/12 : 8 → 0 sur les trois créneaux.** Variété inchangée (10,0 %), `tsc` propre, 1 015 tests verts.

  ⚠️ **Deux garde-fous ont mordu pendant le chantier, et tous deux avaient raison** : mettre le MÊME gras partout faisait passer R2 de 70 à **86** (quasi-jumelles) — d'où un choix par recette qui n'aggrave aucune règle, vérifié en interrogeant `findViolations` ; et `tags.test.ts` a rougi parce qu'une recette qui grossit **change de bande d'objectif** (`tags.objectif` est mécanique, brief §6.5) — recalculé sur les kcal du moteur.
  ⚠️ **`macros_per_serving` N'A PAS été recalculé depuis Ciqual**, et c'est délibéré : c'est le témoin manuel INDÉPENDANT que le test « ±30 % » compare au calcul Ciqual pour détecter un `food_id` mal mappé. L'aligner sur ce qu'il surveille rendrait ce garde-fou vert pour toujours. Seul le delta de l'ingrédient ajouté, pris sur la table manuelle, lui est ajouté.
- ~~**P3.6 — Hors-plan : seules les kcal sont enregistrées**, pas le nom de l'aliment → aucun historique d'écarts possible.~~ ✅ **RÉSOLU** — libellé gardé le 2026-08-04, journal local-only livré le 2026-08-05. Voir **E6**.
- ~~**P3.6 — PostHog** : câblé + dormant, il manque la clé.~~ ✅ **ACTIVÉ le 2026-08-18** —
  déclaré dans les textes légaux et le registre, trois verrous levés (IP, DPA, rétention
  réécrite pour dire le vrai), clé posée en secret GitHub + variable EAS.

  🔴 **MAIS SUR UNE SEULE DES TROIS SURFACES — à lire avant d'en conclure quoi que ce
  soit.** Site web : ✅ en ligne (déploiement automatique au merge, CI verte, vérifié en
  prod). **OTA : ❌ non publié**, report explicite du fondateur le 2026-08-18. Binaire :
  sans objet, le lot est 100 % JS.
  ➡️ Les binaires TestFlight en circulation (canal `production`, runtime `1.0.0`) n'ont
  **ni la clé ni les nouveaux textes**. ⚠️ **Ce n'est pas une incohérence** : sans clé,
  `capture()` est un no-op, donc leur ancien « aucun outil d'analyse tiers » reste VRAI
  chez eux. Clé et textes sont absents *ensemble* — la règle du dépôt joue dans le bon
  sens, rien ne ment nulle part.
  ⚠️ Le jour de l'OTA : **`--clear-cache` obligatoire** (le cache Metro ne s'invalide pas
  sur un changement de valeur `EXPO_PUBLIC_*` — sinon l'update part sans la clé, en
  silence), et la mesure ne démarrera que pour les **nouvelles installations** (un compte
  qui a fini l'onboarding ne revoit jamais l'écran de consentement, donc reste `null`).

  Détail complet : `RGPD-REGISTRE.md`, `PROCEDURE-2026-08-18-activation-posthog.md` §6.

#### 🧹 P4 — Dette technique
- ~~**P4.1 — Trancher le sort de `lib/generatePlan.ts` (chemin IA).**~~ ✅ **FAIT le 2026-07-31 — le fichier est SUPPRIMÉ** (vérifié le 2026-08-05 : il n'existe plus sur `main`). Gain mesuré à l'époque : **−224 Ko (−6,6 %)** sur le bundle web, et un piège de sécurité en moins (une clé posée là aurait été inlinée EN CLAIR dans le bundle public). Si l'IA revient un jour → **Edge Function Supabase, jamais côté client** (cf. CLAUDE.md §2).
- ~~**P4.2 — Journal des migrations appliquées**~~ ✅ **FAIT — `supabase/JOURNAL-MIGRATIONS.md` existe** (vérifié le 2026-08-05). S'y ajoute la commande `npm run check:migrations`, qui interroge la prod au lieu de croire le dépôt (cf. CLAUDE.md §10).
- **P4.3 — Trancher le compte invité.** ⚠️ **ÉNONCÉ COMPLÉTÉ le 2026-08-05 : couper l'auth anonyme CASSE l'accès reviewer des stores.** La fiche présentait un arbitrage simple (« laisser + rate-limit, ou brancher le CAPTCHA ») en ignorant que le chemin reviewer passe par la MÊME porte : `login.tsx` → `isReviewLogin` → `guest()` → `signInGuest()` → `supabase.auth.signInAnonymously()`. Désactiver le provider Anonymous fermerait donc l'accès d'Apple et de Google à l'app — c'est-à-dire exactement ce que B2 attend.
  ✅ **Ce qui est mesuré, et qui est rassurant** : le bouton « Continuer en invité » est **absent du bundle web déployé** (0 occurrence, vérifié sur l'artefact le 2026-08-05 — il est sous `__DEV__`), et `EXPO_PUBLIC_REVIEW_CODE` n'est pas posé par `deploy.yml`, donc `isReviewLogin` renvoie toujours `false` sur le web public. **Aucun chemin d'interface** n'ouvre de compte anonyme en prod.
  🔴 **Ce qui reste vrai** : le risque n'a jamais été l'interface. La clé `anon` est publique par construction (elle est dans le bundle, c'est son rôle), donc si le provider est activé côté Supabase, **n'importe qui peut appeler l'endpoint directement**, sans passer par l'app. Les garde-fous d'écran n'y peuvent rien. Le seul frein est le plafond Supabase (429 `over_request_rate_limit`, par heure et par IP) — un throttle, pas une fermeture.
  ➡️ **RECO** : laisser le provider ACTIF jusqu'aux revues de stores, puis remplacer le chemin reviewer par un **vrai compte e-mail/mot de passe pré-confirmé** (`review@kyroz.app`) — ce qui permet ensuite de couper l'auth anonyme pour de bon ET de supprimer `lib/reviewAccess.ts`. Les tests preview de l'agent basculeraient sur ce même compte.
  ✅ **ÉTAT CONFIRMÉ PAR LE FONDATEUR le 2026-08-05 : le provider Anonymous est ACTIF.** L'accès reviewer fonctionne donc — ne pas y toucher avant la soumission. (Le dépôt ne peut pas le savoir seul, cf. §10.)
  🔴 **ET LA SECONDE OPTION DE CETTE FICHE N'EN EST PAS UNE — mesuré le 2026-08-05.** « Brancher le CAPTCHA » n'est pas un interrupteur de tableau de bord : quand Supabase active la protection CAPTCHA, **tous** les endpoints d'auth exigent un `captchaToken`. Or il n'y a **aucune occurrence** de `captchaToken` dans le code de l'app. L'activer casserait donc l'inscription e-mail, la connexion e-mail ET l'accès reviewer — pas seulement le compte invité. C'est un chantier applicatif (intégrer le widget Turnstile et transmettre le jeton), pas une case à cocher, et il ne se fait pas à la veille d'une soumission.
  ➡️ **Il ne reste donc qu'une option tenable aujourd'hui** : laisser actif, vivre avec le plafond Supabase, et traiter le sujet APRÈS les revues en remplaçant le chemin reviewer par un vrai compte pré-confirmé.

  🧑 **ARBITRÉ PAR LE FONDATEUR le 2026-08-05 : on ne touche à RIEN avant la soumission.**
  Le motif n'est pas le coût — le remplacement est petit — c'est le TIMING : les deux
  options changent **la porte par laquelle Apple va entrer, quelques jours avant qu'il
  n'entre**. L'accès reviewer est la seule chose qui doit marcher du premier coup, il
  marche aujourd'hui, et c'est le chemin décrit dans les notes de soumission
  (`STORE-RELEASE.md` §9/§11). Un rejet coûte une à deux semaines ; le risque évité en
  fermant l'endpoint tout de suite n'en vaut pas la peine.

  📅 **À FAIRE LE LENDEMAIN DE LA PREMIÈRE REVUE PASSÉE** — chiffré le 2026-08-05 :
  · **Fondateur (~10 min)** : créer `review@kyroz.app` avec « Auto Confirm User » ·
    couper le provider Anonymous · corriger la note reviewer dans App Store Connect et
    Play Console.
  · **Agent (~une demi-session)** : retirer `lib/reviewAccess.ts`, la branche
    `isReviewLogin` de `login.tsx` et la variable EAS `EXPO_PUBLIC_REVIEW_CODE` ·
    réécrire `STORE-RELEASE.md` §9 et §11 · rebrancher le harnais de test.
  ✅ **Le harnais ne coûte presque rien, et c'est mesuré** : l'auth invité n'a **qu'un
  seul point d'appel**, `test/_harness.mjs::guestLogin`, qui sait déjà repartir d'un
  `storageState` réutilisé. Les cinq scripts QA passent tous par lui.
  🚫 **Le CAPTCHA n'est pas au programme** : le chantier ci-dessus le rend inutile, et il
  coûterait un build natif + une revue de plus (widget web → intégration webview →
  dépendance native, cf. CLAUDE.md §2).

  ⚠️ **Le seul chiffre qui pourrait rouvrir l'arbitrage** : le **quota d'utilisateurs
  actifs du plan Supabase**, puisqu'un compte anonyme reste un utilisateur. Le dégât
  possible est du VOLUME, pas de la donnée — la RLS est stricte, un compte anonyme
  n'écrit que ses propres lignes. Si le plan est près du plafond, ça devient une
  question de facture et le chantier passe devant.
- **P4.4 — Nettoyages** : ~~supprimer `kcalMargin()` (code mort)~~ ✅ **déjà absent** (vérifié le 2026-08-05) ; ~~déplacer les clés Supabase du workflow vers les **secrets GitHub**~~ ✅ **FAIT le 2026-08-05** — `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` sont des secrets du dépôt, `deploy.yml` ne porte plus aucune valeur. ⚠️ **Ce n'était pas une fuite** : la clé `anon` est publiable par construction et part de toute façon dans le bundle web public. Le vrai motif est ailleurs — un fichier de CI n'est pas l'endroit où vit une clé (la faire tourner imposait un commit), et **rien ne distinguait visuellement celle-ci d'une vraie**, ce qui est exactement comme ça qu'une vraie finit par être collée à côté. ~~créer un `.env.example`~~ ✅ il existe. ~~**RECOMPTER les chiffres de mapping Ciqual**~~ ✅ **RECOMPTÉS le 2026-08-05, et les trois chiffres cités étaient faux** (« 86/113 », « 81/102 », « 21 composites ») : la table `ingredients_reference` porte **125 refs**, dont **117 réellement utilisées** par une recette ; **108/125 sont mappées Ciqual** (**102/117** en ne comptant que les utilisées), et **15 restent saisies à la main** — `cottage_cheese, edamame, fruits_rouges, haricots_noirs_conserve, legumes_wok, levure_maltee, millet, proteine_vegetale, ratatouille, skyr, soja_texture, whey, wrap_sans_gluten, yaourt_grec, yaourt_soja_proteine`. Reste : une partie de ces 15 est sans équivalent Ciqual propre (whey, skyr, protéine végétale, soja texturé, les trois mélanges) ; les autres sont mappables.
- ~~**P4.5 — Deep links web → HTTP 404**~~ ✅ **CORRIGÉ le 2026-08-04** — c'est la même chose qu'**E7**, suivie à deux endroits sous deux noms. Le détail (mesures avant/après, le piège Supabase du pré-rendu, le garde-fou natif) est dans **E7** ; ne pas rouvrir ici.

#### 🚫 Explicitement REPORTÉ (ne pas y toucher sans décision du fondateur)
- **Stores** — **prep codable FAITE 2026-07-17, playbook = `STORE-RELEASE.md`.** ✅ `eas.json` créé (profils dev/preview/production + submit) ; ✅ identifiants d'app `app.kyroz.mobile` (iOS `bundleIdentifier` + Android `package`) ; ✅ **splash natif branché** (`expo-splash-screen` installé + config sombre `#000000` dans `app.json`) ; ✅ permission micro parasite retirée ; ✅ URL de confidentialité en ligne (SIREN OK) ; ✅ textes de fiche FR + réponses aux formulaires confidentialité (Apple/Google) + classification rédigés dans `STORE-RELEASE.md`. **Reste (fondateur, non codable)** : comptes Apple (99 €/an, validation identité 1–4 sem) + Google Play (25 €, ⚠️ compte perso post-2023 = 12–20 testeurs pendant 14 j avant prod) ; screenshots + feature graphic ; lancer `eas build`/`eas submit`. **✅ Accès reviewer réglé en code (2026-07-17, `lib/reviewAccess.ts` + test)** : le guest login masqué en prod (`__DEV__`) aurait bloqué le reviewer au login ; désormais un accès invité est déverrouillé par un code secret posé au build (`EXPO_PUBLIC_REVIEW_CODE`) — le reviewer se connecte en mode Connexion avec `review@kyroz.app` + le code (dans les notes de review) → session invité. **INERTE si le code n'est pas posé** : `deploy.yml` ne le pose pas → bundle web = code vide → accès anonyme reste FERMÉ sur le web public (surface d'abus). Reste au fondateur : poser le secret EAS + le mettre dans les notes de review (cf. STORE-RELEASE.md §9). **Décision en attente** : `supportsTablet` (true → impose des screenshots iPad ; reco false). Web export re-vérifié OK après ajout du splash (bundle JS + baseUrl `/Kyroz-app` intacts). OTA (`eas update`) : non installé, inerte.
- **Monétisation** (`MONETISATION.md`) : prix + périmètre non tranchés ; le découpage proposé est **périmé** (« 50 recettes gratuites vs 100 payantes » alors qu'il y en a **264 pour tous**). → Décider un prix sans un seul utilisateur régulier = spéculer. Rouvrir quand le North Star sera mesuré.
- **Photos cloud / premium** : MVP local existe ; reste Supabase Storage + consentement RGPD + gating premium. Ne devient intéressant que si le premium existe.
- **Approche B « fourchette » de macros** (post-tests utilisateurs) · **Open Food Facts** : jamais branché — la ligne de CLAUDE.md §2 devrait dire « **Ciqual seul** » (à corriger avec le fondateur).
- **« Limites par conception »** d'`adaptRecipe` / `tightenDay` signalées par les auditeurs : ce ne sont **PAS des bugs**, ce sont des arbitrages assumés et documentés. Elles se résorbent seules quand le catalogue grossit (P3.2). **Aucune action dédiée.**

#### 🎯 ORDRE RECOMMANDÉ
1. **P0 en entier** (~3 h) — les seules choses cassées en silence.
2. **En parallèle : lancer P2.1 → P2.2** (contacter 2-3 diététiciennes) — **seul temps long incompressible**, à démarrer pendant qu'on code le reste.
3. **P3.1 (fibres) PUIS P3.2 (catalogue)** — jamais l'inverse.
4. **P1** (SIREN + hard block santé).
5. ~~**P3.3** (TDEE qui saute)~~ — ✅ RÉSOLU 2026-07-27.

*(Rappel LIVRÉ : refonte recettes + scaling par ingrédient (`adaptRecipe`) + fusion Ciqual (`recipeFoodMap.ts`) + `restrictions_ok` dérivé + carb-cycling via `restDayRatio` — **pas** via un tag recette : `rest_day_ok` a été supprimé le 2026-08-03, cf. D22. Cf. §Core loop & moteur / §Data.)*
