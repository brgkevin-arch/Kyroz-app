# Relecture des textes de Kyroz — inventaire avant figeage V1

> **ÉTAT au 2026-08-26** : sections **1, 2, 3 et 4 ARBITRÉES ET FAITES** (décisions
> fondateur). Section 5 hors périmètre — rien à y toucher.
> ⚠️ **Section 3 bis** : au moins 17 phrases de cet inventaire sont derrière un
> drapeau ÉTEINT et ne s'affichent nulle part. Elles sortent de l'arbitrage.
> ⚠️ Un arbitrage de la section 1 a été INVERSÉ après vérification — voir 1.1.
>
> **But** : arrêter les textes DÉFINITIFS de la V1. Ce document ne supprime rien —
> il recense, il prouve, et il propose. L'arbitrage est au fondateur.
> Une fois les textes arrêtés, passe suivante : **humanisation / correction**.
>
> Méthode : extraction automatique de toutes les chaînes affichées de `app/`,
> `components/`, `lib/`, `constants/`, `hooks/` (hors données générées), puis
> filtrage sur les vraies phrases. **735 phrases, 86 fichiers.** Chaque constat
> ci-dessous a été vérifié dans le code, pas déduit d'un `grep`.

---

## 0. Ce qui est SAIN — mesuré, pas supposé

Ces trois vérifications sont revenues vides, et c'est une information :

| vérification | résultat |
|---|---|
| Vocabulaire périmé dans les textes affichés (« frigo » après le renommage en Réserve, « recettes récup », « sèche rapide », « mêmes calories », « coucou », « banque de calories ») | **0 occurrence** |
| Page Méthodologie (`lib/methodologie.ts`, 56 phrases) | **Aucun chiffre en dur** : `MIN_KCAL`, `MAX_DEFICIT_TDEE_RATIO`, `NEAT_PAL`, `EA_HARD_FLOOR`, les bornes protéiques… sont tous **interpolés depuis les constantes du moteur**. Ces textes ne peuvent pas périmer. |
| Textes légaux (`constants/legal.ts`, 51 phrases) | Générés par `npm run gen:legal`. Hors périmètre d'une épure de confort. |

---

## 1. DÉFAUTS — la même chose dite deux fois · ✅ CORRIGÉ

### 1.1 🔴 La phrase sur les photos s'affiche DEUX FOIS sur le même écran

Sur « Suivi du poids », pour un abonné qui a **au moins 2 photos** :

- `components/WeightCheckin.tsx:380` affiche, sous le bouton photo :
  > Tes photos restent sur ton téléphone, jamais envoyées — et ne sont pas sauvegardées : un changement de téléphone les perd.
- puis `<PhotoCompare>` (`components/Transformation.tsx:98`), quelques lignes plus bas dans le **même défilement**, affiche **la même phrase au caractère près**, avec **la même icône** `LocalIcon`.

**Ce n'est pas une divergence, c'est une répétition.** Le contenu est juste des deux
côtés — il est simplement dit deux fois de suite.

➡️ **Proposé d'abord** : garder celle de `PhotoCompare`, retirer celle de `WeightCheckin`.
🔴 **INVERSÉ après vérification.** `PhotoCompare` n'a qu'**un seul appelant** et ne se
monte qu'à partir de **deux photos**. Garder sa copie aurait fait disparaître
l'avertissement pour l'abonné qui n'a encore **aucune** photo — c'est-à-dire celui
qui s'apprête à prendre la première, le seul moment où il sert vraiment.
✅ **Fait** : c'est la copie de `PhotoCompare` qui part ; celle de `WeightCheckin`
reste, et lit désormais la constante.

### 1.2 🟠 Trois copies de cette phrase, aucune source commune

La même promesse existe en **trois exemplaires recopiés** :

| fichier | variante |
|---|---|
| `components/Transformation.tsx:98` | « Tes photos restent sur ton téléphone, jamais envoyées — et ne sont pas sauvegardées… » |
| `components/WeightCheckin.tsx:380` | identique au caractère près |
| `app/kyroz-plus.tsx:189` | « Tes **photos de progression** restent sur ton téléphone. **Elles** ne sont jamais envoyées — et… » |

C'est mot pour mot le défaut du `disclaimer` recopié sept fois (CLAUDE.md §8) :
trois textes libres de diverger sans que personne ne le voie. Sur l'écran qui VEND,
cette phrase est une obligation (ne pas taire la fragilité d'une fonctionnalité
payante) — elle doit rester, mais **pas en copie**.

✅ **Fait** : `lib/photos.ts::PHOTOS_NOTICE_LOCALE`, lue par `WeightCheckin` et par
l'écran de vente. Une seule formulation, qui garde les deux faits (local **et** non
sauvegardé). Verrou : `lib/__tests__/textesUniques.test.ts` refuse toute copie hors
de la source — vérifié par mutation.

### 1.3 🟠 Le check-in du plan se présente en deux formulations

L'utilisateur lit les deux **à la suite** : la carte, puis la feuille qu'elle ouvre.

| surface | texte |
|---|---|
| `app/(tabs)/plan.tsx:922` (la carte) | « Dis-nous ce qui coince — on ajuste **en un tap**. » |
| `components/PlanCheckin.tsx:41` (la feuille) | « Dis-nous ce qui coince — on ajuste **tout de suite**. » |

✅ **Fait** : la ligne de la feuille est retirée (son style `intro`, devenu orphelin,
avec elle). Vérifié avant : cette feuille n'a **qu'une** porte d'entrée, cette carte.
Les quatre lignes d'action disent déjà ce qui est ajustable.

### 1.4 🟡 Masse grasse : le message de blocage recopie le sous-titre

À l'inscription, étape %MG :

- sous-titre (`onboarding.tsx:441`) : « Choisis la silhouette la plus proche de toi, ou saisis ton % si tu le connais. »
- message de blocage (`onboarding.tsx:294`) : « On a besoin de ta masse grasse pour te calculer le plan le plus juste possible — **choisis la silhouette la plus proche de toi, ou saisis ton % si tu le connais.** »

Quand le blocage s'affiche, la seconde moitié de la phrase est déjà à l'écran, deux
centimètres plus haut.

✅ **Fait** : le message s'arrête après « le plus juste possible ».

### 1.5 🟡 « Pas dans le navigateur » dit deux fois dans la roue dentée

`components/ReglagesSheet.tsx` — sur le web, si l'activation du rappel échoue :
ligne 167 (message) « Le rappel quotidien fonctionne sur l'app mobile (iOS/Android),
pas dans le navigateur. » **et** ligne 184 (ligne d'aide) « La notif arrive sur
l'app mobile (pas sur le web). » Les deux peuvent être à l'écran ensemble.

✅ **Fait, mais pas comme prévu.** Retirer la ligne d'aide aurait été une régression :
sur le web, avec un rappel déjà réglé, c'est la SEULE chose qui prévient qu'il ne
sonnera pas — la retirer aurait promis une notification qui n'arrive jamais. C'est
donc le message d'échec qui change : son titre dit déjà « Indisponible sur le web »,
son corps dit maintenant **où ça marche** (« Installe Kyroz sur iOS ou Android pour
recevoir le rappel. ») au lieu de répéter la plateforme une troisième fois.

### 1.6 ⚪ Doublon de code, invisible à l'écran

« Cette date n'existe pas — vérifie le jour et le mois. » existait à l'identique dans
`components/BirthDateField.tsx` et `lib/goalLadder.ts`. Deux validateurs de date, un
seul message : jamais vus ensemble, mais libres de diverger.
✅ **Fait** : `lib/dateLabel.ts::DATE_IMPOSSIBLE`, sous le même verrou que la phrase
des photos.

---

## 2. TEXTES QUI CONTREDISENT UNE RÈGLE ÉCRITE · ✅ CORRIGÉ

### 2.1 🔴 Les paliers de série mettent la pression et comparent

`lib/streak.ts` :

| texte | ce qui coince |
|---|---|
| « Objectif 7 jours atteint. **Ne casse pas la chaîne.** » | Une injonction. C'est exactement de la pression. |
| « Un mois complet. **Tu es dans le club des réguliers.** » | Un « club » suppose les autres — donc une comparaison. |
| « Une régularité **hors norme. Respect.** » | « Hors norme » compare à une norme ; « Respect » juge. **→ GARDÉ : arbitrage fondateur du 2026-08-26, en connaissance de la remarque.** C'est le palier des 100 jours et au-delà, le seul où l'app se permet de saluer. |

**CLAUDE.md §5**, règle assouplie le 2026-07-30 : ce qui est autorisé, ce sont les
mécaniques sobres qui **« rassurent au lieu de mettre la pression »**, et le test à
appliquer est : *« est-ce que ça compare l'utilisateur à quelqu'un d'autre, ou est-ce
que ça l'aide à ne pas décrocher ? »*

Ces trois-là ne passent pas leur propre test. Les autres paliers, si — « Deux
semaines sans casser la chaîne. C'est devenu une habitude. » constate sans exiger.

✅ **Fait** — réécrits en constat :

| avant | après |
|---|---|
| « Objectif 7 jours atteint. Ne casse pas la chaîne. » | « Objectif 7 jours atteint. » |
| « Un mois complet. Tu es dans le club des réguliers. » | « Un mois complet. Le plan fait partie de ta semaine. » |
| « Une régularité hors norme. Respect. » | **inchangé — gardé sur arbitrage du fondateur** |

⚠️ **L'exception est INSCRITE, pas absorbée.** « Une régularité hors norme. Respect. »
reste interdite partout ailleurs : le vocabulaire n'a pas été retiré de la liste,
c'est cette phrase-là qui est nommée. Et le test vérifie qu'elle correspond encore à
un texte réel — une exception qui survit à sa cause redevient un trou. Deux
mutations : propager le vocabulaire à un autre palier → 2 rouges ; faire disparaître
l'exception → 1 rouge.

⚠️ **La règle était écrite depuis le 2026-07-30 et personne ne la comptait** — c'est
pour ça que trois textes ont pu la contredire sans que rien ne rougisse. Elle est
maintenant mesurée : `streak.test.ts` refuse tout vocabulaire d'injonction, de
comparaison ou de jugement dans TOUS les messages de série (0 → 130 jours, paliers
compris), et vérifie en plus que les paliers disent quand même quelque chose — un
test d'absences seul resterait vert si on vidait les messages. Vérifié par mutation :
remettre les deux anciennes formules fait rougir 2 tests.

⚠️ Au passage, un test EXISTANT citait « hors norme » pour vérifier que le palier
générique existe. Il verrouillait donc la formule au lieu de la propriété. Recalé
sur ce qu'il voulait dire : les paliers connus ont chacun leur texte, le générique
prend le relais au-delà.

---

## 3. CANDIDATS À L'ÉPURE — ton goût, pas un défaut · ✅ ARBITRÉ

Rien de faux ici. Ce sont les textes qui ressemblent le plus à ceux que tu as fait
retirer aujourd'hui.

| # | où | texte | pourquoi il est candidat |
|---|---|---|---|
| a | `profil.tsx` — Paramètres des repas, pied | « Ton plan se met à jour automatiquement après enregistrement. » | ✅ **COUPÉ.** Décrivait le bouton posé juste dessous, et c'était le seul texte centré de l'écran. |
| b | `profil.tsx` — Repas cochés automatiquement | 305 caractères sur le fonctionnement de l'auto-coche | ✅ **RACCOURCI, 305 → 186.** Voir la note ci-dessous : la version proposée d'abord perdait un fait. |
| ~~c~~ | ~~`profil.tsx` — Jours plus copieux~~ | ~~300 caractères~~ | 🔴 **RETIRÉ DE LA LISTE le 2026-08-26 : CE TEXTE NE S'AFFICHE PAS.** Voir §3 bis. |
| d | `onboarding.tsx` — jours de repos | « Moins de calories et de glucides ces jours-là… » | ✅ **GARDÉ.** Dernière surface qui l'explique, et l'inscription est le bon endroit : lu une fois, au moment du réglage, sans encombrer un écran quotidien. |

### Note sur b — ce que la première proposition perdait

La version d'abord proposée tombait à 155 caractères en supprimant aussi « le dernier
de la journée en fin de journée ». **Ce n'était pas un ornement** : sans cette règle,
on croit que le dernier repas de la journée ne se coche jamais tout seul. Elle est
donc conservée, sous forme compressée (« — le dernier, en fin de journée »).

Le texte servi, 186 caractères :

> Un repas non marqué passe en « mangé » une heure après le début du suivant — le
> dernier, en fin de journée. Ses ingrédients quittent ta réserve, et un repas coché
> ne revient pas en arrière.

Ce qui est parti n'apportait rien : « comme si tu avais tapé J'ai cuisiné » redisait
le mécanisme, et « si tu préfères décider toi-même, passe sur À la main » décrivait
le segment posé deux lignes plus haut. Les quatre faits restants sont tous
non devinables, et trois d'entre eux modifient des données.

### 3 bis. 🔴 Ce que mon inventaire a mesuré — et ce qu'il n'a PAS mesuré

**L'extraction lit les chaînes du CODE, pas ce que l'écran affiche.** Signalé par le
fondateur : « il n'y a pas de banque de calorie ni de j'ai mangé hors plan ». Vérifié,
et il a raison — deux drapeaux de `lib/featureFlags.ts` sont à `false` :

| drapeau | éteint le | ce qu'il coupe |
|---|---|---|
| `RYTHME_HEBDOMADAIRE_ACTIF` | 2026-08-18 | la ligne « Jours plus copieux » du Profil **et** `CalorieBankEditor`. Il coupe aussi la LECTURE de la donnée (`planEngine::bankOf` rend `undefined`). |
| `PARCOURS_HORS_PLAN_ACTIF` | 2026-08-18 | le bouton « + J'ai mangé hors plan » (Plan) **et** la ligne « Écarts passés » (Profil) |

Ces drapeaux gardent les **seules** portes d'entrée : `setOffPlanOpen(true)` n'est
appelé qu'à ces deux endroits, et `editor === 'calorie_bank'` n'est atteignable que
par la ligne éteinte. Donc `OffPlanSheet`, `OffPlanHistory` et `CalorieBankEditor` ne
se montent jamais dans le build actuel.

**Au moins 17 phrases de cet inventaire ne sont vues par personne** (6 dans
`OffPlanSheet`, 7 dans `OffPlanHistory`, 2 dans `offPlanJournal`, 2 dans
`calorieBank`), plus celles de `CalorieBankEditor` et le bouton hors plan, qui vivent
dans `profil.tsx` et `plan.tsx`.

⚠️ **Elles ne doivent PAS être supprimées.** `featureFlags.ts` documente la procédure
de remise en route, et ces textes en font partie : les effacer rendrait la
réactivation plus coûteuse, pour un gain nul à l'écran. Elles sortent de la liste
d'arbitrage, elles ne sortent pas du dépôt.

➡️ **Conséquence sur la V1** : le figeage des textes ne doit porter que sur les
surfaces ALLUMÉES. Les items a, b et d ci-dessus ont été revérifiés — ils sont bien
atteignables (`MealsEditor` et l'inscription ne sont derrière aucun drapeau). Les
corrections des sections 1 et 2 aussi.

---

**Vérifié et écarté** : les deux phrases « jours de repos » de l'inscription ne sont
PAS un doublon — ce sont les deux branches d'un ternaire sur `sportDeclare`, donc
exclusives. La seconde (« Ils ne changeront tes calories que si tu déclares du
sport ») existe précisément pour ne pas mentir à qui n'a coché aucun sport.

---

## 4. POUR LA PASSE D'HUMANISATION (à ne pas supprimer) · ✅ ARBITRÉ

- **45 citations** dans `lib/reminder.ts` — ✅ **GARDÉES TELLES QUELLES** (arbitrage
  fondateur, 2026-08-26). La remarque tenait sur une quinzaine d'entre elles, de la
  sagesse générale sans lien avec l'alimentation ; elle est levée. Ne pas y revenir
  sans nouvelle décision.
- **Asymétrie de formulation**, `app/(tabs)/reserve.tsx` — ✅ **CORRIGÉE.** « Rien au
  sec pour l'instant — tout ce que tu as est **rangé** au frais. » Les deux jumelles
  se construisent maintenant pareil. À l'usage on bascule d'un côté à l'autre en un
  tap : elles se lisent à quelques secondes d'intervalle, et l'écart s'entendait.

---

## 5. À NE PAS TOUCHER

- `constants/legal.ts`, `components/AnalyticsConsentStep.tsx`, la carte analytics de
  `ReglagesSheet` : obligations RGPD, longueur assumée.
- `lib/safety.ts` et les avis de sécurité du Profil (sortie de déficit, IMC bas,
  énergie disponible) : textes de santé. Leur longueur EST leur fonction.
- `lib/methodologie.ts` : chiffres interpolés, aucun risque de péremption.

---

## 6. Détail de tenue de journal

La session du 2026-08-25 a franchi minuit. Quelques commentaires posés après 00 h 00
portent la date `2026-08-25` alors que l'horodatage réel est le 2026-08-26 (retrait
du bandeau « jour de repos », correctif clavier). Sans conséquence sur le produit —
à normaliser si on veut une chronologie exacte dans le code.
