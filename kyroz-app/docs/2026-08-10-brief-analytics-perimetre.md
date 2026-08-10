# Brief — Que mesure-t-on quand la personne accepte ?

> Document de **brainstorm**, pas une spec. Écrit le 2026-08-10 pour être emmené tel quel
> dans une conversation Claude chat. Rien n'est implémenté à ce jour : le code existant est
> décrit tel qu'il est, les propositions sont marquées comme telles.

---

## 1. De quoi on parle (contexte pour quelqu'un qui ne connaît pas Kyroz)

Kyroz est une app mobile (React Native / Expo) de **plans repas macro-précis** pour adultes
sportifs de 18 à 50 ans. Le cœur du produit :

```
INPUT          → Profil (sexe, âge, poids, taille, objectif, contraintes, repas)
TRANSFORMATION → Génération auto d'un plan repas 7 jours, macro-précis, moteur 100 % LOCAL
OUTPUT         → Plan + liste de courses + recettes
```

Points structurants qui pèsent sur les mesures :

- **Le moteur est local.** Aucune API, aucun LLM à l'exécution. Le serveur (Supabase) ne sert
  qu'à l'authentification et à la synchronisation. Donc **aucune donnée d'usage ne transite
  aujourd'hui**, et rien ne peut être reconstitué côté serveur : ce qu'on ne mesure pas
  explicitement est perdu.
- **Le produit est gratuit**, avec un abonnement (Kyroz+) câblé mais **dormant** — personne ne
  peut encore acheter.
- **North Star : 7 jours actifs sur 14.** C'est la seule métrique de succès déclarée.
- L'app est **solo** : un fondateur non développeur. Un tableau de bord que personne n'a le
  temps de lire ne vaut rien. Le nombre de mesures est un coût, pas seulement un gain.

### Ce qui existe déjà dans le code

`lib/analytics.ts` — un client PostHog Cloud **EU** minimal, écrit à la main (pas de SDK), et
**doublement dormant** :

1. la clé d'ingestion n'est pas posée → rien ne part ;
2. `capture()` sort immédiatement si le consentement n'est pas `granted` → rien ne part non plus.

Sept événements sont nommés et posés dans les écrans :

| Événement | Posé où |
|---|---|
| `onboarding_started` | ouverture de l'assistant |
| `onboarding_completed` | profil validé, avec `goal`, `plan_days`, `meals`, `restrictions`, `has_sport` |
| `first_plan_viewed` | premier plan affiché |
| `plan_opened` | chaque ouverture de l'onglet Plan |
| `meal_cooked` | repas marqué cuisiné, avec `meal_type` |
| `streak_milestone` | palier de série atteint |
| `streak_frozen` | jour manqué pardonné |

Identifiant : un **UUID anonyme tiré sur l'appareil**, jamais l'email, jamais l'id de compte.

⚠️ **Un problème déjà visible dans cette liste** : `onboarding_completed` embarque `goal` et
`restrictions`. Objectif et régime alimentaire sont des **données de santé** (RGPD art. 9). Ces
deux propriétés sont à retirer ou à trancher explicitement — voir §3.

---

## 2. La vraie question à trancher

Pas « quels événements poser » — ça, ça se remplit à l'infini. La question est :

> **Quelles décisions veut-on pouvoir prendre, et quelle mesure minimale les rend possibles ?**

Une mesure qui ne change aucune décision est du bruit qu'on paye en complexité, en surface
juridique et en promesse faite à l'utilisateur.

### Les décisions candidates (à prioriser dans le brainstorm)

| # | Décision qu'on aimerait pouvoir prendre | Ce qu'il faudrait mesurer |
|---|---|---|
| D1 | **Raccourcir l'onboarding** — il fait 7 étapes. Laquelle fait décrocher ? | Étape atteinte / étape abandonnée |
| D2 | **Tenir ou non le North Star** (7 j / 14) | Jours actifs par cohorte d'installation |
| D3 | **Supprimer une feature morte.** Le frigo, les favoris, l'historique de courses, la banque de calories, les visites guidées : lesquels sert-on pour rien ? | Usage par feature, au moins une fois / jamais |
| D4 | **Le plan est-il SUIVI, ou juste consulté ?** C'est la question produit n°1 : un plan qu'on regarde sans cuisiner, c'est un échec silencieux | Repas cuisinés vs repas affichés · écarts hors plan déclarés |
| D5 | **La contrainte « < 1 s » tient-elle sur du vrai matériel ?** Aujourd'hui c'est mesuré en dev, sur un Mac | Durée de génération réelle |
| D6 | **Où le produit casse-t-il chez les autres ?** Erreurs, générations en échec, retombées sur le fallback | Erreurs et fallbacks, sans texte libre |
| D7 | *(le jour où Kyroz+ s'allume)* **Où le paywall convertit-il ?** | Paywall vu depuis quel écran → achat |

👉 **Question de brainstorm** : si tu ne pouvais en garder que **trois**, lesquelles ?
Ma lecture : D4 (le produit marche-t-il ?), D1 (le tunnel d'entrée), D2 (le North Star). D3 et
D5 sont précieuses mais se répondent aussi par d'autres moyens (tests, mesure au simulateur).

---

## 3. Les contraintes — non négociables

Elles ne sont pas là pour faire joli : elles ont déjà coûté des réécritures dans ce projet.

### Interdit dans une propriété d'événement

- **Toute donnée de santé** (RGPD art. 9) : poids, taille, taux de masse grasse, sexe, âge,
  objectif, régime, restrictions, sport pratiqué. Ce sont exactement les champs du profil.
  Les faire sortir change la **nature du consentement**, du registre de traitement et de la
  politique de confidentialité — ce n'est plus la même conversation.
- **Tout texte libre** : aliments détestés, noms de recettes personnalisées, retours écrits.
  Un champ libre finit toujours par contenir une phrase identifiante.
- **Toute photo** (les photos de progression ne quittent jamais l'appareil — c'est écrit dans
  la politique de confidentialité, ça doit le rester).
- **Email, id de compte Supabase, prénom.**

### Obligatoire

- Rien ne part **sans consentement explicite**, et le retrait doit être aussi facile que l'accord.
- Hébergement **UE** (PostHog Cloud EU — déjà le cas).
- **Ce que l'écran de consentement promet doit être exactement ce qui part.** Règle maison :
  pas de mensonge dans Kyroz, la doc et l'UI comptent autant que le code. Si la fiche dit
  « on ne mesure jamais tes données de santé », alors `goal` et `restrictions` sortent de
  `onboarding_completed`.

### Dette documentaire à solder en même temps

Trois textes affirment aujourd'hui qu'**aucun outil d'analyse tiers n'est utilisé**. La phrase
devient **fausse** le jour où la clé PostHog est posée :

- `constants/legal.ts` → politique de confidentialité, section 5 (un commentaire dans le code
  signale déjà l'échéance) ;
- `public/legal.html` → le miroir statique, à tenir à jour à la main ;
- `RGPD-REGISTRE.md` → « aucun traceur publicitaire ou outil d'analyse tiers », et PostHog
  devra apparaître comme **sous-traitant** aux côtés de Supabase.

---

## 4. Proposition de départ — à démolir, pas à valider

Un point de départ concret vaut mieux qu'une page blanche. Voici une v0 **volontairement
courte** (~14 événements), pensée pour couvrir D1, D2, D4 et D6 sans rien d'autre.

### Tunnel d'entrée (D1)

| Événement | Propriété | Pourquoi |
|---|---|---|
| `onboarding_started` | — | déjà là |
| `onboarding_step_viewed` | `step` (1–7) | **le seul moyen de voir OÙ ça décroche** |
| `onboarding_blocked` | `raison` (mineur, IMC, volume) | des refus légitimes, mais combien ? |
| `onboarding_completed` | `plan_days`, `meals` (des **comptes**, pas des contenus) | `goal` et `restrictions` retirés |
| `first_plan_viewed` | `duree_generation_ms` | couvre aussi D5 gratuitement |

### Le produit marche-t-il (D4)

| Événement | Propriété | Pourquoi |
|---|---|---|
| `plan_opened` | `jour_depuis_install` | déjà là ; la propriété donne les cohortes (D2) |
| `meal_cooked` | `meal_type` | déjà là — **le signal d'adhésion réelle** |
| `off_plan_logged` | `recale` (oui/non) | l'écart assumé : est-il déclaré, et recale-t-on ? |
| `plan_regenerated` | `origine` (recalage / profil modifié / manuel) | régénérer beaucoup = le plan ne convient pas |
| `shopping_completed` | `articles`, `coches` (des comptes) | boucler ses courses = intention de cuisiner |

### Rétention (D2)

| Événement | Propriété |
|---|---|
| `streak_milestone` | `days` — déjà là |
| `streak_frozen` | — déjà là |

### Santé technique (D6)

| Événement | Propriété | Pourquoi |
|---|---|---|
| `plan_generation_failed` | `etape` | un fallback silencieux est un bug qu'on ne voit jamais |
| `app_error` | `ecran`, `type` — **jamais** le message brut | l'ErrorBoundary existe déjà et ne remonte rien |

**Non retenus volontairement** : chaque tap de case à cocher, chaque ouverture de recette,
chaque changement de thème. Ça se compte par milliers et ça ne fait basculer aucune décision.

---

## 5. Les questions ouvertes — le vrai matériau du brainstorm

1. **Un interrupteur ou deux ?** Beaucoup d'apps séparent *« diagnostics techniques »* (erreurs,
   plantages) de *« statistiques d'usage »*. Deux interrupteurs = un consentement plus honnête
   et un taux d'acceptation plus élevé sur les erreurs. Mais c'est deux fois plus d'explication
   à lire pour l'utilisateur. **Ça vaut le coup ou c'est de la sur-ingénierie ?**

2. **Le tampon local rétroactif — on garde ou pas ?** Si on demande le consentement *tard*
   (jour 3, ou jamais spontanément), on perd définitivement le tunnel d'entrée : `capture()`
   ne fait rien avant l'accord. La parade technique : **enregistrer les événements localement
   sur l'appareil, ne rien transmettre, et vider le tampon vers le serveur si (et seulement si)
   la personne accepte** — sinon on l'efface. Ça rend une acceptation tardive rétroactivement
   utile.
   ⚠️ **Point juridique non tranché** : stocker sur l'appareil à une fin non essentielle est
   dans la zone grise de la directive ePrivacy, même sans transmission. À poser au juriste
   (la relecture juridique est déjà une case non cochée du registre RGPD).

3. **Combien d'événements avant que ça devienne du bruit ?** Sachant qu'une seule personne les
   lira, entre deux tâches. 14 est-ce déjà trop ? 8 suffiraient-ils ?

4. **La propriété `jour_depuis_install` (D0 / D1 / D7…)** : ce n'est pas une donnée de santé,
   c'est une cohorte. Sans elle, la rétention est très difficile à lire. À confirmer.

5. **Le compte invité.** L'app permet de commencer sans créer de compte (auth anonyme). Que
   devient l'identifiant analytics quand un invité se convertit en compte ? Un invité et son
   compte doivent-ils compter pour **une** personne ou deux ? La réponse change tous les
   dénominateurs de rétention.

6. **Le retrait du consentement.** Aujourd'hui, couper l'interrupteur **arrête** les envois.
   Faut-il aller plus loin et **demander la suppression** des événements déjà partis ?
   (Techniquement faisable : l'identifiant anonyme est stable et connu de l'appareil.)

7. **La durée de conservation.** PostHog garde par défaut très longtemps. 12 mois ? 24 ?
   Ça doit figurer dans le registre et dans la politique de confidentialité.

8. **Comment on relit tout ça.** Un chiffre qu'on ne regarde jamais est un mensonge en
   sommeil : il vieillit sans que personne le corrige. Quel est le rituel — un coup d'œil
   hebdomadaire ? trois nombres épinglés ? Si la réponse est « on verra », il faut mesurer
   moins.

---

## 6. Hors périmètre de ce brief

- **Où et quand demander le consentement** — décision séparée, en cours d'arbitrage.
- Le choix du prestataire (PostHog Cloud EU est déjà câblé, on ne le rouvre pas ici).
- Les mesures liées à l'abonnement Kyroz+ : la brique est dormante, on y reviendra à
  l'allumage (D7).
- Tout ce qui relève de la publicité, de l'attribution ou du suivi inter-applications :
  **définitivement exclu du produit**, ce n'est pas un arbitrage ouvert.
