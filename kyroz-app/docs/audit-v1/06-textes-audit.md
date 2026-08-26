# Audit V1 — Étape 6b : jugement des textes
Source : **Claude.ai**, sur `06-textes-dump.md` (728 chaînes, commit `e731e80`).
Arbitrage : **Claude Code**, 2026-08-26, commit `83367bd`.

> ⚠️ **Ce document se lit en deux temps.** La partie I est l'**arbitrage** : les dix questions
> que 6b déclarait ne pas pouvoir trancher depuis le dump, mesurées dans le code, et les
> corrections que ces mesures imposent à ses constats. La partie II est le **rapport de 6b,
> verbatim**, conservé tel qu'il est arrivé.
>
> Un document qui revient s'arbitre, il ne s'applique pas. Six des dix questions étaient déjà
> répondues par les étapes 1, 2, 5 et 7 ; les quatre autres ont été mesurées pour ce document.

---

# Partie I — Arbitrage

## Les dix questions de 6b, tranchées

| # | Question de 6b | Réponse **mesurée** | Effet |
|---|---|---|---|
| 1 | PostHog est-il branché ? | **NON.** `STATISTIQUES_USAGE_ACTIVES = false` (`lib/featureFlags.ts:72`), garde en **tête** de `capture()`, écran de consentement et bloc Réglages tous deux derrière le même drapeau (`onboarding.tsx:425`, `ReglagesSheet.tsx:323`), clé retirée des **trois** environnements EAS. Éteint depuis la 24ᵉ OTA | **06b-01 descendu P1 → P2** |
| 2 | La suppression efface-t-elle stats, photos, écarts, recettes perso ? | **Localement, OUI, toutes** : `doDelete` fait `AsyncStorage.clear()` (`profil.tsx:351`), qui emporte les 36 clés. Ce qui **survit** est ailleurs : le client RevenueCat et les événements PostHog déjà partis côté serveur | **06b-02 maintenu P1**, mais la cause est plus étroite — c'est mon **01-03** |
| 3 | Le gate 1 j / 7 j est-il d'actualité ? | **NON, abandonné.** `MONETISATION.md:41` : « le core loop reste 100 % gratuit : […] plan 7 jours ». Aucun verrou temporel dans le code | **06b-04 RÉSOLU — sans objet** |
| 4 | L'essai 14 jours est-il implémenté ? | **NON, et ce n'est plus la stratégie.** Remplacé le 2026-07-30 par le grand-pérage (`premium.ts:14-20`). Aucune trace d'essai dans le code ni dans le document vivant | **06b-05 SANS OBJET** — pas de blocage de soumission |
| 5 | Les photos sont-elles gratuites, seule la comparaison premium ? | **OUI.** `WeightCheckin.tsx:65` : « On vend la comparaison, jamais la possession », et le verrou porte sur `can('transformation')` (`:69`) | **06b-06 CONFIRMÉ P1** |
| 6 | `MDP_LONGUEUR_MIN` vaut-il 6 ? | **OUI** — `lib/emailConfirmation.ts:144`. Le texte « 6 caractères minimum » est **vrai** | **résolu, aucun constat** |
| 7 | La création est-elle bloquée sous 18 ans ? | **OUI, trois fois.** `MIN_AGE = 18` (`safety.ts:1007`), `basicsValid` exige `ageN >= AGE_BOUNDS[0]` (`onboarding.tsx:196`), et `checkEligibility` rend `MINOR` (mesuré à l'étape 2, cas H4) | **06b-19 RÉSOLU** — la phrase des CGU est vraie |
| 8 | `formatCitation` a-t-il une branche sans auteur ? | **OUI** — `reminder.ts:299` : `return c.auteur ? \`${c.texte} — ${c.auteur}\` : c.texte;` | **06b-17 : le risque principal N'EXISTE PAS.** Le point sur les attributions apocryphes reste |
| 9 | Le libellé de formule porte-t-il la périodicité ? | **Pas dans le titre**, oui dans le sous-titre : `title={\`${p.label} — ${p.price}\`}` puis `subtitle={p.billed}` = « Débité une fois par an, soit 2,50 € par mois » (`kyroz-plus.tsx:207-213`) | **risque atténué**, titre seul encore ambigu |
| 10 | La migration invité → compte préserve-t-elle le plan ? | **AUCUNE migration n'existe.** `signInGuest` appelle `supabase.auth.signInAnonymously()` (`useAuth.tsx:235`) et rien ne relie ensuite cette session à un compte : pas de `linkIdentity`, pas d'`updateUser({ email })` | **06b-18 CONFIRMÉ**, et sa phrase suggérée serait **FAUSSE** |

## Les cinq corrections que ces mesures imposent

### 🔴 A · Le « bonus honnêteté » de 06b-01 est à REJETER — il réintroduirait un mensonge retiré volontairement

6b écrit :

> « `AnalyticsConsentStep.tsx:122` annonce une conservation **au moins un an**. La durée arrêtée est de **18 mois**. […] **Écris 18 mois.** »

**C'est l'inverse qui est vrai**, et c'est écrit noir sur blanc dans `RGPD-REGISTRE.md:266-277` — arbitrage fondateur daté du **2026-08-18** :

> « La doc PostHog ne documente **aucune rétention d'events configurable** ; le plan gratuit *garantit* 1 an, puis les données passent en stockage froid — **jamais supprimées automatiquement**. […] **Décision fondateur : réécrire la promesse plutôt que construire une purge.** Les quatre surfaces disent maintenant "au moins un an, sans limite haute fixe" — **ce qui est vrai** — au lieu de "18 mois, puis supprimées", **qui ne l'était pas**. […] Ce n'est pas une régression de rétention, c'est le **retrait d'une fausse borne**. »

« 18 mois » était la formulation d'avant, et elle promettait une suppression qui n'a jamais existé. Appliquer la reco de 6b remettrait en production exactement la phrase que la règle « zéro malhonnêteté » a fait retirer.

➡️ **Ne rien changer.** Et noter la leçon générale : une formulation qui *paraît* flatteuse peut être le résultat d'un arbitrage qui a choisi la vérité contre la précision apparente. 6b ne pouvait pas le savoir — le dump ne porte pas les décisions.

### B · 06b-01 : la politique ne ment pas aujourd'hui, mais le minuteur est armé

6b pose deux cas de figure et dit qu'un seul est acceptable. **Le premier est le bon** : PostHog n'est pas branché, donc `legal.ts:120` (« Aucune statistique d'usage n'est collectée ») est **exact en production**.

Ce qui reste — et 6b a raison de l'appeler une bombe à retardement — c'est que les **textes du consentement sont toujours dans le bundle**, simplement non rendus. Le jour où quelqu'un repasse `STATISTIQUES_USAGE_ACTIVES` à `true`, trois écrans se rallument et la phrase légale devient fausse **au même commit**, sans que rien ne rougisse.

➡️ **P2, avec la reco de 6b conservée** : un test qui échoue si `legal.ts` affirme « aucune statistique » alors que le drapeau vaut `true`. Le dépôt sait faire ce garde-fou (`fichesOta.test.ts`, `legal.test.ts`) et c'est exactement le bon usage.

### C · 06b-02 converge avec 01-03, et le mécanisme est meilleur que 6b ne le suppose

6b déduit du bouton séparé « Supprimer mes statistiques » que la suppression de compte ne les efface pas. **Localement, elle les efface** — `AsyncStorage.clear()` emporte `@kyroz:analyticsId`, les photos, les écarts hors plan et les recettes perso.

Le défaut réel est **plus étroit et plus gênant** : `AsyncStorage.clear()` détruit le pseudonyme **avant** qu'il puisse servir à demander la suppression côté PostHog. C'est mon constat **01-03**, trouvé par un autre chemin — deux audits indépendants qui tombent sur le même point, c'est ce qui le rend fiable.

➡️ **P1 maintenu.** La reformulation proposée par 6b est bonne, à une correction près : les photos et les écarts **partent bien** à la suppression, ils ne « partent pas avec l'app ».

### D · 06b-05 est sans objet, et c'est une bonne nouvelle pour la soumission

6b classe en P1 bloquant l'absence de mention d'essai sur le paywall, au titre de la guideline 3.1.2. **Il n'y a pas d'essai** : ni dans le code, ni dans la stratégie vivante. Le paywall n'a donc rien à divulguer, et la guideline ne s'applique pas.

➡️ **Retiré du décompte.** Ce qui bloque réellement la mise en vente est ailleurs : les **quatre abonnements en « Métadonnées manquantes »** faute de capture de review (constat **07-01**).

### E · 06b-18 : la phrase suggérée serait fausse, et 6b l'avait pressenti

6b propose « Tu pourras créer un compte plus tard sans rien perdre », **en conditionnant explicitement** : « à condition que la seconde phrase soit vraie ».

Elle ne l'est pas. `signInGuest` ouvre une session **anonyme Supabase** et **aucun chemin de migration n'existe** — ni `linkIdentity`, ni `updateUser({ email })`, rien. Un invité qui crée un compte ensuite repart d'une session neuve.

➡️ **Le constat devient une dépendance produit, pas un texte.** Écrire la phrase sans construire la migration serait précisément le type de promesse que l'app s'interdit. Deux issues honnêtes : construire la migration, ou écrire « Ton plan reste sur ce téléphone » **et s'arrêter là**.

## Décompte après arbitrage

| | 6b annonçait | Après mesure | Écart |
|---|---|---|---|
| **P1** | 7 | **4** | 06b-04 résolu · 06b-05 sans objet · 06b-01 descendu en P2 |
| **P2** | 12 | **12** | +06b-01 · −06b-17 (risque principal inexistant, reste le point attributions) · +06b-18 requalifié |
| **P3** | 4 | **4** | inchangé |

**Les quatre P1 qui tiennent** : 06b-02 (« toutes tes données » — converge avec 01-03) · 06b-03 (« gratuitement à vie » non daté, engagement contractuel) · 06b-06 (deux définitions du gate photos) · 06b-07 (l'abonnement qui continue après suppression — converge avec **01-05**).

**Deux des quatre étaient déjà trouvés par l'audit du code**, par des chemins totalement différents. C'est le meilleur signal de ce document.

## Ce que 6b a vu et que le code seul n'aurait pas donné

Sans jugement de valeur, la liste de ce qui n'était accessible qu'en lisant les textes **ensemble** :

- **06b-08** — sept formulations pour trois grandeurs différentes du moteur, toutes appelées « plancher ». L'audit du moteur (étape 2) avait vérifié que la chaîne de planchers était **correcte** ; il n'avait pas vu qu'elle est **incompréhensible** vue de l'extérieur. C'est exactement la frontière entre les deux audits.
- **06b-12** — la série n'a de copie que pour la victoire, aucune pour la rupture. Un trou ne se grep pas.
- **06b-09** — « au plus juste » / « précisément » à l'inscription, contredits par la page méthodologie que personne n'ouvre. Un placement, pas un mensonge — invisible fichier par fichier.
- **06b-10 / 06b-11** — le vouvoiement de la méthodologie, le « nous » d'une app qui revendique être faite par une seule personne.
- **06b-14** — « en un instant » démenti par l'écran de chargement situé douze lignes plus loin.
- **06b-20** — l'arbitrage des verbes que l'étape 6a avait explicitement délégué. Il est directement applicable.

---

# Partie II — Rapport de 6b, verbatim

> Conservé tel qu'il est arrivé, sans retouche. Les corrections de la partie I ne sont
> **pas** reportées ici : le document original doit rester lisible tel qu'il a été écrit.

## Résumé exécutif (6b)

| Sévérité | Nombre | Nature |
|---|---|---|
| **P1** | 7 | Textes qui affirment en production quelque chose de faux, ou qui bloquent la soumission |
| **P2** | 12 | Charge mentale réelle, survente, incohérences de voix |
| **P3** | 4 | Finition |

Les trois qui comptent, selon 6b :

1. La politique de confidentialité affirme qu'aucune statistique d'usage n'est collectée, alors que l'app embarque un écran de consentement PostHog complet. → **arbitré en I.B : la politique dit vrai, le drapeau est éteint.**
2. « Toutes tes données seront définitivement supprimées » est suivi d'une énumération qui n'est pas exhaustive. → **maintenu, cf. I.C.**
3. Les CGU promettent Kyroz+ gratuit à vie aux comptes pré-lancement — engagement contractuel irrévocable qui percute la mécanique early bird. → **maintenu.**

## P1 selon 6b

- **06b-01** — la politique nie une collecte que l'app est prête à faire (`legal.ts:120` contre `AnalyticsConsentStep.tsx:86/122`, `ReglagesSheet.tsx:325/351`). Reco : rédiger la section 2 au régime du consentement plutôt qu'à la négation absolue, et poser un test qui échoue si les deux divergent. *Bonus « au moins un an » → **rejeté en I.A**.*
- **06b-02** — « toutes tes données » suivi d'une énumération partielle (`profil.tsx:782`) ; statistiques, photos, écarts hors plan et recettes perso absents de la liste. Même schéma à `legal.ts:224`.
- **06b-03** — « gratuitement, à vie » (`legal.ts:292`) : clause irrévocable, date de coupure indéterminable par l'utilisateur, et collision avec la mécanique early bird. **À trancher, pas à corriger** : si la gratuité est assumée, la **dater** ; sinon la retirer avant la première acceptation des CGU en production.
- **06b-04** — le périmètre gratuit des CGU (`legal.ts:288`, « plan de la semaine ») contredit un gate 1 j / 7 j. Reco : verrouiller le périmètre gratuit dans une constante et générer la phrase des CGU depuis elle.
- **06b-05** — l'essai gratuit n'apparaît dans aucun texte du paywall ; guideline 3.1.2.
- **06b-06** — deux définitions concurrentes du gate photos : `WeightCheckin.tsx:349` (« les photos de progression font partie de Kyroz+ ») contre `:400` et `legal.ts:288` (« la comparaison avant/après »). Reco : le mot « photos » ne doit jamais apparaître à côté de « Kyroz+ ». *Même écran : `kyroz-plus.tsx:246` « Tes deux outils » est du vocabulaire interne.*
- **06b-07** — l'avertissement « supprimer le compte n'annule PAS l'abonnement » existe dans les CGU (`legal.ts:326`) mais pas dans la modale de suppression (`profil.tsx:781-782`). Reco : ligne conditionnelle si un abonnement est actif, plus un lien direct vers la gestion des abonnements du store.

## P2 selon 6b

- **06b-08** — sept formulations de « plancher » pour trois grandeurs distinctes (EA, BMR, `MIN_KCAL`). Reco : n'exposer qu'un seul plancher — celui qui mord — avec une phrase canonique. `profil.tsx:1479` est la meilleure des sept.
- **06b-09** — « au plus juste » (`onboarding.tsx:450`) et « précisément » (`:501`) contredits par `methodologie.ts:164`. Le corpus sait faire l'inverse : `BodyFatPicker.tsx:280` et `profil.tsx:1109` sont le bon standard.
- **06b-10** — `lib/methodologie.ts` vouvoie dans une app qui tutoie, et c'est l'écran que le reviewer ouvrira (guideline 1.4.1). Frontière proposée : **contractuel vouvoie, produit tutoie**.
- **06b-11** — trois locuteurs coexistent (« on / nous », « Kyroz », aucun) alors qu'`avis.tsx:87` revendique « fait par une seule personne ». Reco : « Kyroz » pour le moteur, « je » pour l'auteur, le « nous » disparaît.
- **06b-12** — la série n'a de copie que pour la victoire, aucune pour la rupture — le moment de désinstallation le plus probable. Le corpus sait pourtant parler à ce moment-là (`OffPlanHistory.tsx:53`, `reminder.ts:274`, `plan.tsx:1317`). *Note : « de série » est ambigu en français → « d'affilée ».*
- **06b-13** — le consentement santé ne couvre pas le mode invité (`login.tsx:229` vs `:272`, `legal.ts:133`). Et « retirer le consentement en supprimant votre compte » doit être **expliqué**, sinon ça se lit comme une sanction.
- **06b-14** — « en un instant » (`plan.tsx:1108`) démenti par « Nouveau plan en route… » (`:1098`).
- **06b-15** — la masse grasse est « (optionnel) » dans le Profil (`profil.tsx:942`) et sans mention à l'inscription (`onboarding.tsx:460`).
- **06b-16** — « Aider à réparer Kyroz » ouvre la demande de consentement par un aveu de casse. Ne toucher que le titre et la première phrase : le reste de l'écran est excellent.
- **06b-17** — risque de fausse attribution des citations maison. *Le risque principal est levé (`formatCitation` a la branche sans auteur, cf. I) ; reste le point des attributions apocryphes à sourcer.*
- **06b-18** — « Continuer en invité » ne dit pas ce qu'il coûte. *Requalifié en dépendance produit, cf. I.E.*
- **06b-19** — « Aucun compte ne peut être créé en deçà de cet âge » (`legal.ts:246`) est une affirmation testable. *Résolu : le blocage existe à trois endroits, cf. I.*

## P3 selon 6b

- **06b-20** — **arbitrage des verbes**, directement applicable :
  - **Confirmer** → un seul verbe, **Enregistrer**. `HydrationBar.tsx:201` « OK » et `BirthDatePicker.tsx:100` « Valider » deviennent « Enregistrer ». `MotDePasseOublie.tsx:148` « Valider le code » reste (sens propre : vérification). `StreakCelebration.tsx:74` « Continuer » reste (célébration).
  - **Accuser réception** → **Compris** canonique ; `profil.tsx:1079` « C'est noté » s'aligne. `BirthdayCelebration.tsx:142` « Merci » reste.
  - **Retirer** (réversible, dans une liste) · **Supprimer** (destruction définitive : compte, photo, statistiques) · **Vider** (contenant entier). `BodyFatPicker.tsx:299` « Effacer ma sélection » → « Retirer ma sélection ». « Effacer » disparaît du corpus. « Réinitialiser » reste légitime (retour à un état antérieur).
- **06b-21** — l'espace insécable : la convention **existe déjà** (`DatedGoalCard.tsx:114` porte un ` `), appliquée une fois sur 97. Point technique : utiliser ` ` partout, y compris devant `? ! ;` — ` ` n'est pas rendue de façon fiable en React Native.
- **06b-22** — doubles espaces avant le chevron de suppression (`profil.tsx:1575`, `DislikedFoodsField.tsx:68`).
- **06b-23** — « Manger comme prévu, c'est déjà une **victoire** de la journée » (`reminder.ts:262`) : cadrage victoire/défaite appliqué au fait de manger, isolé parmi 47 citations qui l'évitent.

## Ce que 6b juge bon, et pourquoi

Section conservée parce qu'elle fixe le standard à rejoindre :

| Source | Ce qui marche |
|---|---|
| `profil.tsx:542`, `:563`, `:982` | Le moteur explique sa décision, dit « tu n'as rien à faire », laisse une sortie |
| `OffPlanHistory.tsx:53` · `reminder.ts:341` | Désamorcent la lecture culpabilisante de leur propre fonctionnalité |
| `avis.tsx:127`, `:132` | Énumèrent ce qui n'est **pas** envoyé ; « c'est toi qui l'envoies » |
| `methodologie.ts:159-164` | Sépare littérature et choix maison — sans équivalent connu dans une app grand public |
| `BodyFatPicker.tsx:280` | Quantifie le coût d'une saisie approximative au lieu de la décourager vaguement |
| `onboarding.tsx:478` | Désambiguïse le double comptage NEAT/sport en une phrase |
| `AnalyticsConsentStep.tsx:99-128` | « Ce qui ne l'est jamais », pseudonyme, réversibilité |
| `kyroz-plus.tsx:172-193` | Un paywall qui énumère ce qu'il **ne prend pas** |
| `plan.tsx:1317` | Le moteur atteint sa limite et le dit sans dramatiser |

## Ce que 6b ne couvre pas

Textes hors dépôt (fiches store, e-mails Supabase réellement servis, paywall RevenueCat distant, permissions iOS) · la confrontation texte ↔ comportement du moteur, qui relève de l'étape 9 · les 512 recettes et les noms d'aliments · le jugement clinique des seuils cités.

⚠️ 6b note que **le paywall distant est le plus risqué des quatre** : c'est le seul qui puisse contredire `kyroz-plus.tsx` sans qu'un `git diff` le voie.
