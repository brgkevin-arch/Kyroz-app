# Triage de la liste fondateur du 2026-09-02

> **D'où vient cette liste.** Trente lignes notées par le fondateur, en trois blocs :
> *À améliorer/Ajouter*, *Plus tard ou Kyroz+*, *Kyroz +*. Elles sont reprises **mot pour
> mot** ci-dessous, jamais reformulées : une note reformulée cesse d'être vérifiable.
>
> **Ce que ce document EST** : un arbitrage à trancher. Chaque ligne a été confrontée au
> code, pas au souvenir, et porte soit une **preuve** (fichier:ligne, ou une mesure), soit
> la mention explicite « non vérifié ».
>
> **Ce que ce document N'EST PAS** : une liste de tâches. `AGENTS.md:13` fixe la règle —
> *« une tâche vit dans la liste unique »*, avec un numéro protégé par
> `lib/__tests__/agentsIds.test.ts`. Ouvrir ici un second inventaire de travail à faire
> rouvrirait exactement ce que le rangement du 2026-08-30 a refermé. ➡️ **Ce qui survit à
> l'arbitrage descend dans les sections A–F d'`AGENTS.md` avec son numéro** ; ce document
> reste, daté, comme la trace du raisonnement.

---

## 0. Deux corrections à ce qui a été dit en séance

Les deux changent une décision, donc elles passent avant le reste.

### 0.1 — Le crash reporting n'est pas un oubli, c'est une décision **dont le déclencheur est en train de se lever**

Il a été dit en séance : *« il n'y a rien aujourd'hui, c'est un vrai manque »*. La première
moitié est vraie, la seconde est fausse. `CLAUDE.md` (tableau des dépendances) porte :

> **Crash reporting — AUCUN — décision du 2026-08-27.** Option A du constat `03-05` : pas
> de quatrième sous-traitant, donc rien à ajouter à la politique, au registre ni aux DPA.
> **Rouvrir si** : *sortie publique hors TestFlight* · un crash rapporté non reproduit ·
> un parc au-delà de quelques dizaines d'appareils.

🔴 **Le premier critère de réouverture est précisément ce qui arrive.** L'app est en revue.
La décision de 2026-08-27 n'était pas « jamais », c'était « pas tant qu'on est en
TestFlight ». La note du fondateur tombe donc **au bon moment**, et ce n'est pas une idée
neuve à évaluer : c'est une condition écrite qui se réalise.

➡️ Ce qui reste à arbitrer n'est pas *si*, c'est *quand* : l'option B est notée comme
coûtant **un build de plus**. Un build de plus ne se glisse pas dans une soumission en
cours (cf. §3.2).

### 0.2 — Le médiateur ne dort plus : il est l'**étape 9, ouverte**, d'une procédure en cours

Il a été dit en séance : *« il ne mord que si tu vends, rien à faire tant que rien n'est
vendu »*. C'était la note de `constants/legal.ts`… **avant le 2026-08-27**. Le commentaire
qui s'y trouve aujourd'hui dit l'inverse, et se corrige lui-même :

> 🔴 **LE DÉCLENCHEUR A ÉTÉ ARMÉ LE 2026-08-27 — `PAYWALL_LAUNCH` PORTE UNE DATE.**
> Cette note disait « elle ne mord pas encore, Kyroz étant intégralement gratuit ». La
> prémisse est tombée. […] Elle mord à la **PREMIÈRE VENTE** — pas à la pose de la date,
> pas au merge. **La fenêtre entre les deux est tout ce qui reste pour s'en occuper.**

Vérifié : `lib/premium.ts:60` → `PAYWALL_LAUNCH = '2026-08-27T00:00:00+02:00'`. Et la
`PROCEDURE-2026-08-25-mise-en-vente-kyroz-plus.md` porte le médiateur en **étape 9,
non cochée**, avec la ligne : *« un MÉDIATEUR de la consommation → aucune adhésion
n'existe »*.

➡️ Ce n'est pas une phrase à écrire, c'est **un contrat payant à souscrire**, puis son nom
et ses coordonnées à reporter dans les CGU (L.616-1 impose les coordonnées, pas la simple
existence). Délai de souscription non mesuré — **c'est ce qui rend la fenêtre étroite.**

---

## 1. Le seul défaut mesuré de toute la liste

- **« ne pas défiler les silhouettes avant d'avoir choisi homme ou femme »**

  ✅ **Fondé, et plus grave que la note ne le dit.** La note décrit un problème d'ordre
  d'affichage ; c'en est un de **calcul**.

  | fait | preuve |
  |---|---|
  | Le sexe est pré-coché sur `'male'` | `app/(auth)/onboarding.tsx:156` — `useState<Sex>('male')` |
  | L'étape 2 se valide **sans** que le sexe ait été touché | `onboarding.tsx:197` — `basicsValid` teste âge, poids, taille. Pas le sexe. |
  | Les silhouettes de l'étape 3 lisent ce sexe | `onboarding.tsx:468` — `<BodyFatPicker sex={sex} …>` |
  | Le sexe alimente le moteur | `lib/tdee.ts`, `checkEligibility`, `lib/safety.ts` |

  🔴 **Conséquence** : une femme qui remplit poids/taille/date sans toucher le segment
  passe l'étape 2, voit des silhouettes d'homme, et repart avec un **TDEE calculé en
  homme**. Elle n'a rien fait de travers — le défaut a répondu à sa place.

  ⚠️ **Et la règle qui corrige ça est DÉJÀ dans ce fichier, huit lignes plus haut**, pour
  le NEAT (`onboarding.tsx:172`) :

  > `null` ET PAS `DEFAULT_NEAT_LEVEL` : rien n'est présélectionné, et l'étape ne se valide
  > pas tant que la réponse manque. Pré-cocher aurait laissé **le défaut passer pour une
  > réponse**.

  ➡️ Ce n'est donc pas une fonctionnalité à ajouter, c'est **une incohérence interne à
  refermer** : `sex` en `Sex | null`, et `basicsValid` qui exige `sex != null`.

  ⚠️ **Un point à trancher, pas à improviser** : les comptes existants portent tous un
  `sex` non nul. Le passage à `null` ne concerne que l'onboarding, **pas** la colonne
  (`schema.sql:31` garde son `check (sex in ('male','female'))`). Aucune migration.

---

## 2. Déjà livré — ne pas reconstruire

| La ligne | Ce qui existe | Verdict |
|---|---|---|
| **« objectif daté »** *(Kyroz+)* | `profiles.goal_target` (schéma), `lib/goalMilestones.ts`, `lib/__tests__/datedGoal.test.ts`, `objectifDatePerime.test.ts`. `CLAUDE.md` : *« valeur premium tranchée + construite (2026-07-27) »* | ✅ **LIVRÉ.** À retirer de la liste. |
| **« Photo poids »** *(Kyroz+)* | `lib/photos.ts` — MVP local-only, avec le motif RGPD écrit dedans (photo de corps = donnée de santé, aucun upload cloud) | ✅ **LIVRÉ** dans sa forme locale. Le cloud est en §F d'`AGENTS.md` (« ne devient intéressant que si le premium existe » — or il existe désormais : à re-trancher, pas à supposer). |
| **« Suivi du résultat »** | `components/PlanCheckin.tsx` | ⚠️ **Existe, mais pose une AUTRE question.** Cf. §6. |
| **« Régénération d'un repas dans un plan »** | Le reroll existe au niveau **plan entier** — `app/(tabs)/plan.tsx:473`, `generate(reroll)` + `nextPlanSeed` | ⚠️ **Partiel.** Le manque est le grain : un repas, pas la semaine. La mécanique de seed est déjà là. |
| **« Choisir jour de la pesée »** | Une **fréquence**, pas un jour : `weigh_in_frequency` (`daily/weekly/biweekly/monthly`), `components/ReglagesSheet.tsx:203` | ⚠️ **Raffinement réel.** Sur `weekly`/`biweekly`, aucun moyen de dire *quel* jour. |

🔴 **Et une ligne qui rouvre une décision du fondateur lui-même :**

- **« + de phrase de bonjour »** — la rotation `Bonjour` / `Salut` / `Coucou` **a existé et
  a été retirée sur son propre retour**. C'est écrit dans `lib/salutation.ts:22` :
  *« je n'aime pas trop le mot coucou, on reste sur Bonjour pour l'instant »*. Le fichier
  a été ramené à **un seul axe : le moment de la journée**.
  ➡️ La remettre est légitime — mais alors **en sachant qu'on change d'avis**, et en
  gardant l'axe horaire (un « Bonjour » à 22 h reste faux).

---

## 3. Déjà tranché ailleurs — ne pas relancer sans rejouer la décision

### 3.1 — « nettoyer sql avec api » *(= schéma Supabase, via l'API plutôt qu'à la main)*

**Le ménage est déjà fait, et déjà sous surveillance.**

- **Zéro table morte.** 6 tables au schéma (`profiles`, `streaks`, `favorites`, `pantry`,
  `weight_logs`, `recipe_overrides`), et **les 6 sont interrogées** par l'app. Le seul
  ménage de table à faire l'a été : `supabase/migrations/2026-06-14_drop_meal_plans.sql`.
- **Une seule colonne morte, sur ~46**, et le dépôt la nomme déjà —
  `lib/__tests__/profileCols.test.ts:48` :
  > `stripe_customer_id: 'COLONNE MORTE : zéro usage dans le code de l'app (paiement = achat in-app via RevenueCat, Stripe seul écarté par les stores)'`

  Mesuré : elle apparaît **deux fois** dans tout le dépôt — `schema.sql:105` et ce test.
  Nulle part ailleurs.
- Le reste des colonnes hors synchro (`email`, `consent_health_data`, `consent_at`,
  `created_at`, `updated_at`) est classé `DELIBERATELY_EXCLUDED` **avec son motif**. Ce
  test partitionne chaque colonne du schéma en *synchronisée* vs *volontairement exclue* :
  une nouvelle colonne non classée le fait rougir.

  *(Non vérifié : ce test n'a pas été **exécuté** — ce worktree n'a pas ses `node_modules`.
  C'est le contenu du fichier qui est rapporté, pas un run vert.)*

⚠️ **Le vrai obstacle n'est pas celui que la note vise.** Ce qui pèse, c'est le geste
manuel : quand une PR porte une migration, elle doit être jouée **à la main dans l'éditeur
SQL, avant le merge**, sinon l'auto-deploy livre du code qui attend une colonne absente.
Fondé. Mais l'API ne le résout pas tout de suite — `supabase/JOURNAL-MIGRATIONS.md`,
mesuré le 2026-08-27 :

1. la CLI **ignore les 18 fichiers** (elle attend `20260614120000_nom.sql`, le dépôt a
   `2026-06-14_nom.sql`) — *« Skipping migration… »*, dix-huit fois ;
2. le registre distant est **vide** : toutes les migrations ont été jouées à la main.

➡️ Donc `db push` ne pousserait rien et `migration list` ne compare rien. Le journal note
déjà que le réparer n'est pas gratuit : renommer ne suffit pas, il faut `migration repair`
sur chacun, sinon le premier `push` rejouerait tout sur une base qui les porte déjà —
*« à décider, pas à improviser »*.

🔴 **Avertissement sur le DROP.** `stripe_customer_id` est sûre à supprimer **précisément
parce qu'aucun binaire ne la nomme** — c'est le seul critère. Une colonne retirée alors
qu'un binaire installé la porte encore dans `PROFILE_COLS` fait rejeter **l'upsert
entier** : pas le champ, tout le profil, en silence, l'app continuant de marcher en local.
C'est le mode de panne qui a coupé la synchro **trois fois**. Un `drop column` le
reproduit volontairement. Et le parc n'est pas à jour par définition : soumission en revue
+ builds TestFlight installés.

➡️ **Arbitrage proposé** : ne rien toucher en prod maintenant. Après la sortie, dans cet
ordre — (1) renommage des 18 fichiers + `migration repair` ; (2) `db push` opérationnel ;
(3) le `drop stripe_customer_id` passe alors comme 19ᵉ migration, en une ligne. Le
bénéfice réel n'est pas la propreté du schéma : c'est que **le fondateur cesse d'être
l'étape manuelle obligatoire entre une PR et son déploiement.**

### 3.2 — « Sign apple »

Voulue, mais la règle App Store **4.8 ne mord pas** : elle ne s'applique qu'à une app qui
propose *déjà* un login tiers, et Kyroz n'en a aucun.

🔴 **Et le vrai risque n'est pas technique** : retirer la soumission en cours pour y
glisser un build ferait **sauter les 4 abonnements** avec elle. Cette ligne attend la
sortie, sans exception.

### 3.3 — « analyse des anciens plans » *(Kyroz+)*

⚠️ **Cette ligne rouvre une porte fermée exprès.** Analyser d'anciens plans suppose de les
**stocker**. Or `AGENTS.md` note, à propos du journal des repas hors plan :

> lui donner une table **rouvrirait la porte fermée en supprimant `meal_plans`**.

Le plan est aujourd'hui un **calcul** reproductible à partir du profil et d'un seed
(`nextPlanSeed`), pas un objet conservé. En faire un historique, c'est ajouter une table de
données de comportement alimentaire — donc registre RGPD, rétention, export, suppression.

➡️ Pas un refus : un **arbitrage produit** qui a déjà été rendu une fois dans l'autre sens.
À rejouer explicitement, ou à écarter.

---

## 4. Fondé et chiffré : le détail des recettes

- **« étape des recettes + détaillées »**

  ✅ **Fondé.** Mesuré sur les **512** recettes de `Recette/recettes-kyroz.json` (champ
  `instructions`) :

  | | min | **médiane** | max |
  |---|---|---|---|
  | étapes par recette | 1 | **3** | 7 |
  | mots par recette *(toutes étapes confondues)* | 2 | **21** | 173 |

  - **339 / 512** tiennent en ≤ 3 étapes
  - **284 / 512** tiennent en ≤ 30 mots
  - la plus courte fait **2 mots**

  ➡️ C'est **une vague de contenu**, pas une tâche de développement — même format que les
  lots B7→B9. Le générateur de briefs (`scripts/gen-brief-lot.ts`) est l'outil.

  ⚠️ **Un point à mesurer avant de commander** : les recettes portent des `instructions`
  télégraphiques *par construction*, et l'écran qui les affiche a été dessiné pour ça.
  Tripler le volume change la mise en page de `RecipeDetail`. **Non vérifié** : l'écran
  n'a pas été mesuré avec une recette de 80 mots.

---

## 5. Vrais manques, petits

- **« Afficher le mot de passe quand on l'écrit »** ✅ **Fondé.** Aucun bouton œil sur les
  trois champs : `app/(auth)/login.tsx:220`, `components/MotDePasseOublie.tsx:169`,
  `app/(tabs)/profil.tsx:866`. ➡️ Petit, et placé sur l'écran où l'on perd le plus de
  monde — l'inscription.

  *(Note : le champ de `profil.tsx:866` n'est pas un changement de mot de passe, c'est la
  ré-authentification avant suppression de compte. Il porte déjà sa propre cicatrice de
  contraste, cf. le commentaire au-dessus.)*

- **« Changer mot de passe, nom, mail etc »** ✅ **Fondé.** Aucun `updateUser` dans le
  Profil. Le seul chemin existant est la réinitialisation par e-mail
  (`components/MotDePasseOublie.tsx`) — donc « changer », non ; « récupérer », oui. Le
  prénom est purement local (`lib/profileName.ts`).

- **« Pouvoir partager sa liste, la save dans les notes ou l'avoir dans photo »**
  ✅ **Fondé.** Aucun partage dans `app/(tabs)/courses.tsx`. Le seul `Share`/export du
  dépôt est `lib/exportData.ts` (export RGPD), qui n'a rien à voir.

- **« ajouter une recette qu'on aime depuis les recettes au plan actuellement »**
  ✅ **Fondé.** Aucun chemin Recettes → Plan dans `app/(tabs)/recettes.tsx`.
  ⚠️ **Mais ce n'est pas un bouton** : injecter une recette choisie dans un plan dont les
  macros sont bouclées, c'est du moteur (`tightenDay`, `adaptRecipe`). À ne pas chiffrer
  comme une ligne d'UI.

- **« Choisir jour de la pesée »** — cf. §2. Le réglage existe en fréquence ; le jour
  manque. ⚠️ Piège connu : un réglage lu par un AUTRE écran ne se relit pas « au focus »
  — sans diffusion explicite, il n'agit qu'au redémarrage.

- **« ICONE app perso »** ✅ **Fondé** (aucune icône alternative déclarée dans `app.json`).
  ⚠️ Coût réel : les icônes alternatives iOS sont une **capacité native**, donc **un build
  de plus**. À grouper avec le crash reporting (§0.1) si les deux se font.

- **« conseil, se peser à jeun le matin »** ✅ **Fondé** — aucune occurrence dans le
  dépôt. C'est une ligne de texte, pas un chantier. ⚠️ Sa place est près de
  `WeightCheckin`, et sa formulation tombe sous la règle de réassurance (§6).

---

## 6. La ligne la plus précieuse — et son risque

> **« Suivi du résultat : tu suis bien le plan ? Si oui résultat ? Ou oui keep going, Non,
> on réévalue le plan, mauvaise saisie ? »**
> **« repérer si la pesée n'est pas en accord avec l'objectif de la personne. Lui demander
> ce qui ne va pas »**

C'est **le produit**. Le reste est un générateur de plans ; ceci est ce qui rend le plan
utile au mois 2.

⚠️ **Et ce n'est pas ce que fait `PlanCheckin` aujourd'hui.** Son titre est *« Ton plan te
convient ? »* et ses cinq issues sont : satisfait · trop répétitif → variété max ·
régénérer · ajuster dans le Profil · ne plus demander. C'est une question de **goût**.
La note décrit une question de **résultat** : *l'as-tu suivi, et est-ce que ça marche ?*
Ce n'est pas la même app.

🔴 **Le piège, et il est frontal.** Demander « tu suis bien le plan ? » à quelqu'un qui
décroche, c'est lui présenter une addition. Il répondra « oui » ou fermera l'app — et dans
les deux cas la mesure est perdue **et** la personne est un peu plus loin. C'est exactement
ce qu'interdit la règle de réassurance : *zone, pas ligne ; zéro alarme ; le moteur porte
la charge.*

➡️ **La forme qui tient** : le moteur **constate et s'adapte**, il ne demande pas de
comptes. Les matériaux existent déjà — `weight_logs`, le journal hors plan
(`@kyroz:offPlan`, local), `deficit_weeks`, `goal_target`. Il ne dit pas « tu n'as pas
suivi » : il dit « on recale ».

⚠️ **Et un garde-fou déjà écrit s'applique** : la pause à la maintenance après 8 semaines
de déficit consécutives (`deficit_weeks`). Un suivi de résultat qui proposerait de
« creuser » quand ça stagne entrerait en collision avec elle. Toute réévaluation doit
passer par le moteur existant, pas à côté.

---

## 7. Les lignes qui changent la nature du produit

Elles méritent d'être gardées — mais **pas dans la même liste** que « afficher le mot de
passe ». Mélangées, la liste se lit comme si tout se valait.

| La ligne | Ce que ça engage réellement |
|---|---|
| **« Proposez vos recettes »** | Contenu généré par les utilisateurs → **App Store 1.2** : modération, signalement, blocage, réponse sous 24 h. Seul, c'est une **astreinte permanente**, pas un développement. ⚠️ Et le catalogue est un **produit** (`AGENTS.md`) : y verser du contenu non curé contredit la raison d'être des 512 fiches. |
| **« Scan ticket de caisse »** · **« Scan repas si on a pas mangé le plan »** | Deux moteurs de reconnaissance. Chacun de la taille du générateur de plans. ⚠️ Le scan repas touche en plus la donnée de comportement alimentaire, aujourd'hui **local-only par décision**. |
| **« livraison via Leclerc etc »** | Dépendance à un tiers **sans API publique**. ⚠️ Même famille que la position déjà tenue sur les sources tierces : *« le catalogue est un produit, pas un annuaire »*. |
| **« connecter apple health »** | HealthKit → capacité native (**un build**), déclarations App Privacy, et un pas vers la zone **dispositif médical** que `CLAUDE.md` évite explicitement (*« le produit n'est pas un dispositif médical »*). |
| **« Demander les outils pour cuisiner et adapter les plats »** · **« Batch cooking »** · **« Option couple / famille »** · **« Plusieurs semaines de plan »** | Quatre entrées dans le **moteur**, pas dans l'UI. La dernière change aussi la liste de courses (aujourd'hui un calcul mis en cache, borné à 30 sorties / 180 jours). |

---

## 8. Ce qui n'a PAS été vérifié

Nommé pour que personne ne le prenne pour un blanc-seing :

- `profileCols.test.ts` n'a pas été **exécuté** (pas de `node_modules` dans ce worktree).
- Le rendu de `RecipeDetail` avec des instructions trois fois plus longues (§4).
- Le **délai de souscription** à un organisme de médiation (§0.2) — c'est lui qui dit si la
  fenêtre est confortable ou non.
- Le coût réel de l'option B du crash reporting (§0.1) au-delà de « un build de plus ».
- Les lignes du §7 n'ont reçu **aucun chiffrage** : elles sont qualifiées, pas estimées.

---

## 9. Destination proposée dans la liste unique (`AGENTS.md`)

À trancher par le fondateur, puis à reporter **avec un numéro** — en le choisissant sur
`main` **et** sur les branches ouvertes (la section E a été renumérotée trois fois en une
journée le 2026-08-10).

| Section d'`AGENTS.md` | Ce qui y descend |
|---|---|
| **🔴 A — en retard ou cassé en silence** | Le sexe pré-coché (§1) — c'est le seul de la liste qui produit un résultat faux. |
| **📱 C — sortie stores** | Médiateur (§0.2, = étape 9 de la procédure de mise en vente) · crash reporting (§0.1) · afficher le mot de passe (§5). |
| **🧹 E — dette technique** | Renommage des migrations + `migration repair`, puis `drop stripe_customer_id` (§3.1) · changer mot de passe / nom / mail (§5). |
| **🍽 D — catalogue** | La vague de détail des 512 recettes (§4). |
| **🎯 B — Kyroz+** | Le suivi du résultat (§6) — la seule ligne de la liste qui vaut une brique premium. |
| **🚫 F — ne pas relancer** | « + de phrases de bonjour » (§2, décision fondateur déjà prise) · « analyse des anciens plans » (§3.3, porte fermée avec `meal_plans`) · les cinq lignes du §7 tant qu'aucun utilisateur ne les a demandées deux fois. |

> ⚠️ **Rappel de contexte, et il pèse sur tout ce document** : Kyroz a **512 recettes et
> zéro utilisateur**. Cette liste est un inventaire d'**intuitions**, pas de demandes.
> Les scans, la livraison et le mode famille sont des choses qu'on construit quand
> quelqu'un les a réclamées — pas quand on les a imaginées.
