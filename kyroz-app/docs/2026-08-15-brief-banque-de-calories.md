# Brief — La banque de calories sert-elle à quelque chose ?

> Document de **brainstorm**, pas une spec. Écrit le 2026-08-15 pour être emmené tel quel dans
> une conversation Claude chat. Tout ce qui est décrit dans les sections 2 à 6 est le code
> **tel qu'il est aujourd'hui**, lu et vérifié. Les analyses et les propositions sont marquées
> comme telles. Rien n'a été modifié.

---

## 1. De quoi on parle (contexte pour quelqu'un qui ne connaît pas Kyroz)

Kyroz est une app mobile (React Native / Expo) de **plans repas macro-précis** pour adultes
sportifs de 18 à 50 ans. Le cœur du produit :

```
INPUT          → Profil (sexe, âge, poids, taille, objectif, contraintes, repas)
TRANSFORMATION → Génération auto d'un plan repas 7 jours, macro-précis, moteur 100 % LOCAL
OUTPUT         → Plan + liste de courses + recettes
```

Points structurants pour ce sujet :

- **Le moteur est local et déterministe.** Aucune API. Le plan se re-dérive du profil, donc il
  n'est pas stocké en base — il vit dans le stockage de l'appareil et se régénère.
- **Le produit est gratuit.** Un abonnement (Kyroz+) est câblé mais **dormant** : `PAYWALL_LAUNCH`
  vaut `null`, donc **toutes les features premium sont ouvertes à tout le monde aujourd'hui**.
- **Trois piliers annoncés pour Kyroz+** : objectif daté · suivi de transformation · **banque de
  calories**. C'est le troisième qui est en question ici.
- **North Star : 7 jours actifs sur 14.**
- L'app est solo, un fondateur non développeur. Toute surface d'écran ajoutée est un coût.

### Deux règles produit non négociables, qui contraignent toute proposition

1. **Anti-charge mentale.** Tout suivi affiché doit **rassurer, jamais mettre la pression**. Pas
   de carnet de fautes, pas d'alarme, le pire cas reste une phrase neutre. Une app de nutrition
   anxiogène perd l'utilisateur, donc le North Star.
2. **Pas de mensonge.** Un chiffre affiché est celui qui sera servi. Si le moteur n'arrive pas à
   faire ce qu'il annonce, l'écran doit le dire.

---

## 2. Ce que la banque de calories fait, mécaniquement

**L'idée d'origine** : « resto samedi soir ». La personne déclare un écart calorique sur un jour,
et la **semaine se rééquilibre autour**. C'est le seul des trois piliers premium qui touche le
moteur de génération.

### La donnée

```
profiles.calorie_bank : jsonb   →   { "<jour de la semaine>": <écart kcal signé> }
```

Exemple réel : `{ "6": 600 }` = « samedi, +600 kcal ».

La clé est un **jour de la semaine** (0 = dimanche … 6 = samedi), **pas une date**. Il n'y a
aucun champ de date, aucune expiration. Une fois posé, l'écart s'applique **à tous les samedis,
indéfiniment**, jusqu'à ce que quelqu'un aille l'enlever à la main.

### Le calcul (`lib/calorieBank.ts`, module pur et testé)

1. Chaque jour part de sa cible normale, **plus** l'écart déclaré du jour.
2. Ce qui a été ajouté est **repris sur les autres jours du plan**, à parts égales.
3. Les jours qui portent eux-mêmes un écart déclaré **ne servent pas d'amortisseur** — « samedi je
   mange plus » ne veut pas dire « samedi je mange plus ET moins ».
4. Répartition en plusieurs passes : un jour qui bute sur le plancher de sécurité rend sa part
   aux autres.
5. Ce qui n'a **pas pu** être repris est renvoyé à part (`uncompensatedKcal`) — le module écrit
   explicitement que l'interface doit l'afficher, parce qu'un écart avalé en silence est un
   mensonge.

### Trois invariants que le module respecte

| Invariant | Détail |
|---|---|
| **Les protéines ne bougent jamais** | Elles ont un plancher **quotidien**. Un jour à +600 kcal ne dispense pas de ses protéines, et un jour compensé n'en perd pas. |
| **Aucun jour ne descend sous le plancher** | Plancher = `max(métabolisme de base, filet absolu 1500 H / 1200 F)`. Pas le filet absolu seul : compenser jusqu'à 1200 kcal chez une femme dont le minimum physiologique est ~1863 est précisément ce que les garde-fous de sécurité interdisent. |
| **La semaine garde son total** | Le mécanisme **déplace** des calories, il n'en crée ni n'en retire. Donc le déficit hebdomadaire, la trajectoire d'objectif daté et la cible du profil sont inchangés. |

### Cas dégénéré traité explicitement

Sur un plan d'**un seul jour**, ou si un écart est déclaré sur **tous** les jours, il n'y a rien
sur quoi emprunter → **on ne compense pas, et on le dit**. Le repli naïf (« répartir sur tout le
monde ») reprendrait sur le jour même ce qu'on vient d'y ajouter et annulerait le choix de la
personne : déclarer +500 rendait +0.

---

## 3. Comment on y accède aujourd'hui

**Une ligne de menu dans l'écran Profil**, entre « Paramètres des repas » et « Écarts passés ».
Elle affiche « Aucun écart prévu », ou « Samedi +600 ».

L'éditeur qui s'ouvre :

- un texte : *« Un resto, un anniversaire ? Dis-le à Kyroz : il répartit l'écart sur tes autres
  jours de la semaine. Tes protéines ne bougent pas, et aucun jour ne descend sous ton plancher
  de sécurité. »*
- une rangée de **jours de la semaine** (seuls les jours du plan sont proposés) ;
- des montants pré-réglés : **+200 · +400 · +600 · +900**, ou une valeur libre ;
- un aperçu « Ta semaine après répartition » : les 7 jours avec leur nouvelle cible et l'écart.

**Le parcours réel pour un resto samedi** : jeudi, y penser → Profil → Banque de calories →
choisir samedi → choisir +600 → enregistrer. Puis **dimanche, tout refaire en sens inverse** pour
que ça ne s'applique pas au samedi suivant, et à tous les suivants.

**La banque n'apparaît nulle part sur l'écran Plan** — l'écran principal, celui qu'on ouvre tous
les jours. Poser « samedi +600 » fait baisser lundi→vendredi **en silence**. Et
`uncompensatedKcal` (ce que la semaine n'a pas réussi à reprendre) est **calculé et affiché nulle
part**, alors que le module dit lui-même qu'il faut l'afficher.

---

## 4. Le mécanisme concurrent, qui existe déjà et qui est gratuit

Kyroz a un **second** chemin pour les écarts, plus ancien, sur l'écran Plan, hors Kyroz+ :

**« J'ai mangé hors plan »** → on saisit l'écart (avec un libellé, « Pizza · 300 g ») → l'app
**enregistre sans rien toucher**, puis **demande** :

> **+600 kcal assumées, c'est noté**
> Comment tu veux rentrer dans ta cible ? Tes protéines restent pleines dans tous les cas.
> - Répartir sur mes repas restants → ≈ 2 104 · *reprend 410 kcal*
> - Sauter la collation → …
> - Concentrer sur le dîner → …
> - **Non, je garde mon plan**

Trois différences majeures avec la banque :

| | Banque de calories | « J'ai mangé hors plan » |
|---|---|---|
| **Moment** | AVANT — il faut prévoir | APRÈS — on déclare ce qu'on a mangé |
| **Portée du rééquilibrage** | les autres **jours de la semaine** | les **repas restants du jour** |
| **Où** | écran Profil, dans les réglages | écran Plan, là où on est déjà |
| **Durée** | permanent, tous les samedis | ponctuel, ce jour-là |
| **Trace** | aucune | journal « Écarts passés », 6 mois |
| **Payant ?** | pilier Kyroz+ | gratuit |

### Le journal, et sa décision produit

Le journal des écarts ne compte **pas les écarts** : il dit **ce que le moteur en a fait**. Une
liste de dérapages serait un carnet de fautes — exactement la charge mentale que le produit
refuse. Le message est « le moteur a encaissé », pas « tu as dérapé ». (Données stockées sur
l'appareil uniquement, jamais synchronisées : comportement alimentaire = donnée sensible.)

---

## 5. Ce que le recalage du jour ne sait pas faire — et c'est mesuré

Rééquilibrer sur les repas restants d'**une** journée **sature** : on ne peut pas dé-manger, et
les repas restants ont une taille minimale. Chiffres relevés sur le moteur, écart déclaré le
matin, à la meilleure option ; le nombre est **ce qui reste au-dessus de la cible du jour après
adaptation** :

| Écart déclaré | H 80 kg (cible 2 104) | F 55 kg (cible 1 342) |
|---|---|---|
| +200 kcal | +6 | +18 |
| +300 kcal | +21 | +63 |
| +600 kcal | **+41** | **+318** |
| +800 kcal | — | +518 |

Chez un grand gabarit le recalage absorbe vraiment. Chez un petit gabarit il sature vite —
physiquement normal.

**Et l'app le dit déjà.** Quand aucune option ne rentre dans la cible, la feuille affiche :

> *« Une seule journée ne peut pas tout reprendre — tes repas restants ont une taille minimale.
> Voilà ce qu'on peut faire aujourd'hui ; le reste ne se rattrape pas, et une journée ne fait
> pas ta semaine. Tes protéines restent pleines dans tous les cas. »*

C'est la règle anti-charge-mentale appliquée : on dit la vérité sans alarmer.

**Analyse (pas du code) :** la banque est le seul mécanisme qui pourrait faire disparaître ces
318 kcal, en les étalant sur 6 jours (~53 kcal/jour, invisible). Mais 318 kcal sur une semaine
représentent environ **5 % du déficit hebdomadaire d'une sèche**. La question à trancher est
donc : est-ce que ça vaut une feature, un écran, et un pilier d'abonnement ?

---

## 6. Les trois défauts constatés

**1. Le mécanisme est hebdomadaire, la promesse est ponctuelle.** L'écran dit « Un resto, un
anniversaire ? ». Un anniversaire ne tombe pas tous les mardis. L'outil sait dire « mes samedis
sont comme ça » ; le texte promet « ce samedi-ci ». Le cas récurrent (« repas de famille tous les
dimanches ») est réel et bien servi — mais ce n'est pas celui qui est vendu.

**2. Il faut le régler à l'avance, dans un écran de réglages, puis revenir l'annuler.** Six
gestes pour poser, six pour retirer, pour un dîner.

**3. Il est invisible là où la personne vit.** Rien sur l'écran Plan, et le reliquat non compensé
n'est jamais affiché.

⚠️ **Ce qui n'est PAS mesuré, et qu'il ne faut pas affirmer :** personne ne sait combien de gens
utilisent la banque. Les statistiques d'usage (PostHog) sont **câblées mais dormantes** — aucune
clé posée, donc zéro donnée. « Personne ne s'en sert » est une **hypothèse**, pas un constat.

---

## 7. L'enjeu

La banque est le **3ᵉ pilier de Kyroz+**, et le seul qui touche le moteur. La retirer fait passer
l'offre payante à **deux** piliers : objectif daté + suivi de transformation.

Le paywall n'est pas lancé (`PAYWALL_LAUNCH = null`), donc **rien n'est urgent** : aujourd'hui
tout le monde a accès à tout, gratuitement. Mais c'est une décision à prendre **avant** d'allumer
le paiement, pas après.

---

## 8. Position du fondateur (2026-08-15)

> *« J'veux pas surcharger l'écran Plan, et je trouve que le système fonctionne bien juste avec
> "j'ai mangé hors plan". »*

Toute proposition qui **ajoute une carte, un bouton ou un bloc visible en permanence sur l'écran
Plan** est donc à écarter, ou à défendre très fort.

---

## 9. Les trois options déjà sur la table

**A. Supprimer la banque.** Module, colonne `calorie_bank`, ligne de menu, éditeur. Kyroz+ passe
à 2 piliers. Le plus simple, et défendable : le chemin réactif couvre le besoin réel et le
produit assume déjà honnêtement sa limite.

**B. Garder le moteur, changer la porte d'entrée** — une **4ᵉ option dans la feuille de recalage
qui s'ouvre déjà** : « Répartir sur mes repas restants » / « Sauter la collation » / « Concentrer
sur le dîner » / **« Étaler sur ma semaine »**. Zéro surface ajoutée à l'écran Plan (la feuille
existe et liste déjà des cartes), la ligne disparaît du Profil, le pilier premium survit, et
l'option n'apparaît que quand le recalage du jour sature.
⚠️ Coût réel : le moteur actuel étale sur **tous** les jours du plan, jours passés compris.
Appliqué après coup, il faut étaler sur les jours **restants** seulement. C'est une variante de la
fonction existante, pas une réécriture — mais ça touche le moteur, qui est le cœur du produit.

**C. Laisser dormir.** On ne touche à rien, on décide au moment d'allumer le paywall.

---

## 10. Questions ouvertes pour le brainstorm

1. **Est-ce qu'un besoin de « prévoir » existe vraiment ?** Ou est-ce que la nutrition se vit
   toujours au passé — on déclare ce qu'on a mangé, jamais ce qu'on va manger ? Y a-t-il des
   produits où la déclaration anticipée fonctionne, et pourquoi ?
2. **Les 318 kcal non rattrapées valent-elles une feature ?** Physiologiquement c'est marginal.
   Psychologiquement, est-ce que « c'est rattrapé » vaut mieux que « ça ne se rattrape pas, et
   une journée ne fait pas ta semaine » — ou est-ce que la seconde phrase est en fait le
   meilleur produit, parce qu'elle enlève la pression au lieu de la déplacer ?
3. **Le cas RÉCURRENT est-il un vrai cas ?** « Tous les dimanches, repas de famille » existe. Mais
   si c'est le rythme réel de quelqu'un, est-ce que ce n'est pas simplement **son plan** — que le
   moteur devrait apprendre à partir du journal des écarts, plutôt que de le faire déclarer ?
4. **Que vend-on dans Kyroz+ si la banque part ?** Deux piliers suffisent-ils, ou faut-il un
   troisième — et lequel ?
5. **Y a-t-il une 4ᵉ option** que les trois ci-dessus ne couvrent pas ?

---

## Annexe — où vit le code

| Rôle | Fichier |
|---|---|
| Calcul de la répartition (pur, testé) | `lib/calorieBank.ts` |
| Tests | `lib/__tests__/calorieBank.test.ts` |
| Branchement moteur (`bankedTargets`, `dayTargetKcal`) | `lib/planEngine.ts` |
| Plancher de sécurité de la banque | `lib/tdee.ts::bankFloorKcal` |
| Ligne de menu + éditeur | `app/(tabs)/profil.tsx` (`CalorieBankEditor`) |
| Colonne en base | `supabase/migrations/2026-07-30_profiles_calorie_bank.sql` |
| Gating premium | `lib/premium.ts` (`calorie_bank`) |
| **Chemin concurrent** — options de recalage du jour | `lib/planEngine.ts::adaptDayOptions` |
| **Chemin concurrent** — saisie + feuille de décision | `app/(tabs)/plan.tsx` (`logOffPlan`) |
| **Chemin concurrent** — journal des écarts | `lib/offPlanJournal.ts` |
