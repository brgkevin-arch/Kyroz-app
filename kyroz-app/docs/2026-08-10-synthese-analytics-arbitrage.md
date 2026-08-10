# Kyroz — Analytics : périmètre de mesure, synthèse d'arbitrage

> Sortie du brainstorm du 2026-08-10 sur `2026-08-10-brief-analytics-perimetre.md`.
> **Ce document n'est pas un ordre d'implémentation immédiat.** Il contient des décisions
> tranchées (§3), des décisions bloquantes non tranchées (§4), et une liste d'événements
> qui ne doit être codée qu'une fois le §4 résolu. Lire §2 avant tout.

---

## 1. Ce qui a changé par rapport au brief

| Point du brief | Arbitrage retenu |
|---|---|
| « 3 décisions à garder : D4, D1, D2 » | **D1, D2, D4, D6** — D6 (santé technique) entre, parce qu'un fallback silencieux rend D4 ininterprétable |
| Un interrupteur ou deux (§5.1) | **Un seul.** Voir §3.1 |
| Tampon local rétroactif (§5.2) | **Abandonné.** Voir §3.2 |
| « identifiant anonyme » | **Pseudonyme.** Le mot « anonyme » sort des textes. Voir §3.3 |
| Conservation (§5.7) | **18 mois** |
| `onboarding_completed` porte `goal` et `restrictions` | **Retirés** (confirmé) |
| `onboarding_blocked` avec `raison` incluant IMC | **Motif santé retiré** (nouveau — le brief se contredisait) |

---

## 2. Le principe de coupe

Un événement n'est posé que si **un seuil de décision est écrit avant de le poser** :
sous la forme *« si X est sous Y au bout de Z, je fais W »*.

Sans seuil pré-écrit, la métrique se fait rationaliser après coup — surtout quand une seule
personne la lit. C'est le trou principal du brief initial : il liste des mesures, pas des
règles de décision.

Corollaire : **le jeu d'événements doit être exploitable à 40 utilisateurs comme à 4000.**
À 40, seuls les gros écarts sont lisibles (catastrophes, pas optimisations) ; à 4000, tout
devient lisible mais rien ne peut être reconstruit rétroactivement puisque le moteur est
local. D'où : poser peu, poser tôt, ne lire que quand le volume le permet.

---

## 3. Décisions tranchées

### 3.1 Un seul régime juridique : consentement pour tout

Il existe une voie alternative (exemption CNIL « mesure d'audience », art. 82 loi
Informatique et Libertés) qui dispenserait de consentement pour la partie purement
technique : mesure des performances, détection de problèmes de navigation, optimisation
ergonomique, pour le compte exclusif de l'éditeur, statistiques anonymes uniquement, pas de
suivi inter-applications, identifiant ≤ 13 mois, données brutes ≤ 25 mois, IP anonymisée.

**Elle est écartée**, pour trois raisons :

1. la conformité de PostHog Cloud à ces critères **n'est pas vérifiée** (depuis janvier 2026
   c'est une auto-évaluation à la charge du fournisseur — il faudrait la leur demander) ;
2. elle exige des statistiques **anonymes**, ce qui est incompatible avec la suppression
   ciblée retenue en §3.3 ;
3. elle ajoute un troisième régime à documenter et à défendre, pour un projet solo. Le coût
   de maintenance dépasse le gain.

⚠️ Si un jour Kyroz veut mesurer sans écran de consentement, la voie existe — mais elle
implique probablement de changer d'outil (Matomo auto-hébergé, Plausible) et de renoncer à
toute mesure comportementale. À rouvrir seulement si le taux d'acceptation du consentement
s'avère catastrophique.

### 3.2 Pas de tampon local rétroactif

Écrire des événements sur l'appareil pour une finalité non essentielle, même sans
transmission, relève très probablement de l'article 82. Le point n'est pas définitivement
tranché en jurisprudence, mais **le débat ne vaut pas le gain** : le tampon n'existe que pour
compenser un consentement demandé tard. Trancher le moment du consentement (§4.1) rend le
tampon inutile.

### 3.3 « Pseudonyme », pas « anonyme »

Le retrait du consentement doit déclencher une **demande de suppression** des événements
déjà partis (techniquement possible : l'UUID est stable et connu de l'appareil).

Conséquence directe et non négociable : si les événements sont supprimables par individu,
ils **ne sont pas anonymes**. Le mot « anonyme » doit disparaître de la politique de
confidentialité, de `public/legal.html` et de l'écran de consentement, remplacé par
« identifiant pseudonyme tiré sur l'appareil, jamais relié à ton compte ni à ton email ».

Règle maison : ce que l'écran promet doit être exactement ce qui part. Elle s'applique aussi
au vocabulaire.

### 3.4 Vocabulaire des métriques : « appareils », jamais « personnes »

L'identifiant est lié à l'installation. Réinstallation = nouvel identifiant. Deux appareils =
deux lignes. **Ne jamais faire d'`alias` / `identify` vers l'id Supabase** — ça
réintroduirait le lien avec le compte et ferait tomber toute la promesse.

Un invité qui se convertit en compte garde le même UUID : c'est une seule ligne, et c'est le
comportement voulu.

Toutes les métriques nommées et lues doivent dire « appareils actifs », « appareils
retenus ». Le biais est structurel et non corrigeable : autant qu'il soit nommé.

### 3.5 Conservation : 18 mois

12 mois interdirait toute comparaison d'une année sur l'autre — or ce marché est très
saisonnier (janvier, avant-été). 18 mois couvre une saison complète plus une marge, et reste
sous le plafond de référence de 25 mois. À inscrire dans `RGPD-REGISTRE.md` et dans la
politique de confidentialité.

### 3.6 Rituel de lecture

- **Coup d'œil hebdomadaire** sur trois nombres, pas plus.
- **Décision mensuelle uniquement**, et seulement contre un seuil pré-écrit (§2).

Les trois nombres :
1. jours actifs médians sur 14, par cohorte d'installation mensuelle ;
2. ratio repas cuisinés / repas affichés ;
3. taux d'échec de génération.

---

## 4. Décisions bloquantes — NE RIEN CODER AVANT

### 4.1 Où et quand demander le consentement 🔴

**C'est la variable qui détermine la moitié du reste**, et le brief l'avait mise hors
périmètre. Deux options :

- **Avant l'onboarding** → D1 mesurable, mais demande faite avant d'avoir livré la moindre
  valeur : taux d'acceptation faible, première impression froide.
- **Après `first_plan_viewed`** → demande faite au moment où la valeur vient d'être livrée,
  taux d'acceptation bien meilleur, mais **le tunnel d'entrée est perdu définitivement**
  (pas de tampon, cf. §3.2).

Tant que ce n'est pas tranché, les 4 événements du bloc « tunnel » (§5) ne doivent pas être
posés : ils seraient morts-nés dans le second scénario.

### 4.2 Définition de « jour actif » pour la North Star 🟠

« 7 jours actifs sur 14 » — actif = `plan_opened` (ouverture d'onglet) ou = au moins un
`meal_cooked` ? Les deux définitions se contredisent : D4 pose qu'un plan consulté sans être
cuisiné est un échec, or la première définition le compterait comme un succès.

**Ne pas trancher maintenant.** Capter les deux événements avec `jour_depuis_install` permet
de calculer l'une ou l'autre plus tard. Trancher au moment de la première lecture réelle.

### 4.3 Relecture juridique 🟠

Case déjà non cochée dans `RGPD-REGISTRE.md`. Points à faire valider : la formulation de
l'écran de consentement, la qualification pseudonyme, la durée de 18 mois, la suppression sur
retrait.

---

## 5. Événements v1 — liste exacte

**Propriété globale, sur TOUS les événements** : `jour_depuis_install` (entier).
Ce n'est pas une donnée de santé, c'est une cohorte, et sans elle la rétention est illisible.

### Bloc tunnel — bloqué par §4.1

| Événement | Propriétés | Décision servie |
|---|---|---|
| `onboarding_started` | — | D1 |
| `onboarding_step_viewed` | `step` (1–7) | D1 — le seul moyen de voir où ça décroche |
| `onboarding_completed` | `plan_days`, `meals` (des **comptes**) | D1 |
| `onboarding_blocked` | `motif` : `age` \| `volume` \| `autre` | D1 |

⚠️ `onboarding_blocked` : le brief proposait `raison` incluant `IMC`. **Interdit** — dire
« cette installation a été bloquée pour IMC hors bornes » est une donnée de santé, et ça
contredit directement l'engagement pris dans la politique de confidentialité. Le motif IMC se
compte **localement sur l'appareil**, jamais transmis.

⚠️ `onboarding_completed` : `goal` et `restrictions` **retirés** (confirmé par rapport au code
actuel — c'est une modification de l'existant, pas un ajout).

### Bloc produit — D4

| Événement | Propriétés | Note |
|---|---|---|
| `first_plan_viewed` | `duree_generation_ms` | couvre D5 gratuitement |
| `plan_opened` | — | déjà posé |
| `meal_cooked` | `meal_type` | déjà posé |
| `plan_regenerated` | `origine` : `recalage` \| `profil_modifie` \| `manuel` | régénérer beaucoup = le plan ne convient pas |
| `off_plan_logged` | `recale` (bool) | l'écart assumé |

⚠️ **Étiquetage de `meal_cooked`** : cet événement mesure *un tap sur un bouton*, pas une
cuisson. Impossible de distinguer « n'a pas cuisiné » de « a cuisiné sans cocher ». Le chiffre
absolu ne veut rien dire ; seules la tendance dans le temps et la comparaison entre cohortes
sont exploitables. À écrire dans le tableau de bord à côté du chiffre, sinon il sera relu
dans six mois comme un taux d'adhésion réel.

`shopping_completed` (proposé dans le brief) est **écarté** : aucun seuil de décision ne lui
est associé.

### Bloc rétention — D2

| Événement | Propriétés |
|---|---|
| `streak_milestone` | `days` — déjà posé |
| `streak_frozen` | — déjà posé |

### Bloc santé technique — D6

| Événement | Propriétés |
|---|---|
| `plan_generation_failed` | `etape` |
| `app_error` | `ecran`, `type` — **jamais** le message brut |

**Total : 13 événements**, dont 4 conditionnés au §4.1 et 5 déjà posés dans le code.

---

## 6. Interdits absolus dans une propriété d'événement

- Toute donnée de santé : poids, taille, %MG, sexe, âge, objectif, régime, restrictions,
  sport pratiqué, IMC, motif de blocage lié à l'un d'eux.
- Tout texte libre : aliments détestés, noms de recettes personnalisées, retours écrits,
  message d'erreur brut.
- Toute photo.
- Email, id de compte Supabase, prénom.
- Tout ce qui relève de la publicité, de l'attribution ou du suivi inter-applications.

---

## 7. À vérifier côté PostHog avant de poser la clé

1. **L'adresse IP est-elle collectée et stockée côté ingestion ?** À vérifier et à
   désactiver si oui. Le client est écrit à la main, mais le comportement dépend de la
   configuration serveur, pas du client. Une IP stockée fait tomber toute la promesse.
2. **Rotation de l'identifiant** : l'UUID actuel est stable à vie. Une rotation périodique
   renforcerait la position, mais casserait les cohortes longues. Compte tenu de §3.3
   (pseudonyme assumé), **pas de rotation** — mais c'est un choix, à documenter comme tel.
3. Durée de rétention configurée à 18 mois côté projet PostHog, pas seulement écrite dans la
   politique.
4. DPA PostHog signé, au même titre que celui de Supabase.

---

## 8. Dette documentaire — même lot de commit, pas plus tard

Trois textes affirment aujourd'hui qu'aucun outil d'analyse tiers n'est utilisé. La phrase
devient fausse à la seconde où la clé est posée.

- [ ] `constants/legal.ts` → politique de confidentialité, section 5 (un commentaire signale
      déjà l'échéance)
- [ ] `public/legal.html` → miroir statique, à tenir à jour à la main
- [ ] `RGPD-REGISTRE.md` → retirer « aucun traceur publicitaire ou outil d'analyse tiers » ;
      ajouter PostHog comme **sous-traitant** à côté de Supabase ; inscrire la durée de 18 mois
- [ ] Partout : remplacer « anonyme » par « pseudonyme » là où ça concerne l'analytics (§3.3)
- [ ] Écran de consentement : la liste de ce qui part doit correspondre exactement au §5

**Règle de commit : la clé PostHog et la mise à jour des trois textes partent ensemble.**
Aucun état intermédiaire où le code ment.

---

## 9. Ce qu'on ne fait volontairement pas

- Chaque tap de case à cocher, chaque ouverture de recette, chaque changement de thème.
- Tout tableau de bord au lancement : les événements se posent maintenant parce que le moteur
  est local et que ce qui n'est pas capté est perdu — pas parce qu'il y aura quelque chose à
  lire tout de suite.
- Les mesures liées à Kyroz+ (D7) : brique dormante, on y revient à l'allumage.
- Le choix du prestataire : PostHog Cloud EU est câblé, on ne le rouvre pas ici (sauf si §3.1
  est un jour rouvert).

---

## 10. À écrire avant de poser la clé — les seuils

À remplir à la main. Tant qu'une ligne est vide, l'événement correspondant ne se pose pas.

| Décision | Seuil pré-écrit | Action si franchi |
|---|---|---|
| D1 — raccourcir l'onboarding | si l'étape __ perd plus de __ % en __ semaines | |
| D2 — North Star | si les jours actifs médians sur 14 sont sous __ après __ cohortes | |
| D4 — le plan est-il suivi | si le ratio cuisiné/affiché est sous __ % sur __ jours | |
| D6 — santé technique | si le taux d'échec de génération dépasse __ % | correction immédiate |
